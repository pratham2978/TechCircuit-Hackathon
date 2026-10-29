const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

const SCRIPT_PATH = path.join(__dirname, '..', 'ml', 'predict.py');
const MODEL_PATH = path.join(__dirname, '..', 'ml', 'artifacts', 'tone_model.joblib');
const METRICS_PATH = path.join(__dirname, '..', 'ml', 'reports', 'evaluation_metrics.json');

async function predictTone(text) {
  if (!text || !text.trim()) {
    return {
      predicted_tone: 'Neutral',
      confidence: 1.0,
      probabilities: {},
      model_version: 'v1.0-local-sklearn',
      status: 'empty_input'
    };
  }

  // Fix 3: Graceful degradation — check model artifact exists before spawning Python
  if (!fs.existsSync(MODEL_PATH)) {
    return {
      predicted_tone: null,
      confidence: null,
      probabilities: {},
      model_version: 'v1.0-local-sklearn',
      status: 'unavailable',
      error: 'ML model artifact not found. Run: python ml/train.py'
    };
  }

  return new Promise((resolve) => {
    const pythonCmd = process.env.PYTHON_CMD || (process.platform === 'win32' ? 'python' : 'python3');
    let pyProcess;

    try {
      pyProcess = spawn(pythonCmd, [SCRIPT_PATH, text], {
        cwd: path.join(__dirname, '..', 'ml'),
        env: { ...process.env, PYTHONIOENCODING: 'utf-8' }
      });
    } catch (spawnErr) {
      // Fix 3: Python binary not found — return unavailable, don't crash the review scan
      return resolve({
        predicted_tone: null,
        confidence: null,
        probabilities: {},
        model_version: 'v1.0-local-sklearn',
        status: 'unavailable',
        error: `Could not launch Python process: ${spawnErr.message}`
      });
    }

    let stdoutData = '';
    let stderrData = '';

    const timer = setTimeout(() => {
      pyProcess.kill();
      resolve({
        predicted_tone: null,
        confidence: null,
        probabilities: {},
        model_version: 'v1.0-local-sklearn-timeout-fallback',
        status: 'unavailable',
        error: 'Python tone classification timed out after 15s'
      });
    }, 15000);

    pyProcess.stdout.on('data', (data) => {
      stdoutData += data.toString();
    });

    pyProcess.stderr.on('data', (data) => {
      stderrData += data.toString();
    });

    pyProcess.on('close', (code) => {
      clearTimeout(timer);
      if (code === 0 && stdoutData.trim()) {
        try {
          const result = JSON.parse(stdoutData.trim());
          resolve(result);
        } catch (e) {
          resolve({
            predicted_tone: null,
            confidence: null,
            error: `Failed to parse ML response: ${e.message}`,
            model_version: 'v1.0-local-sklearn',
            status: 'unavailable'
          });
        }
      } else {
        resolve({
          predicted_tone: null,
          confidence: null,
          error: stderrData || `Python process exited with code ${code}`,
          model_version: 'v1.0-local-sklearn',
          status: 'unavailable'
        });
      }
    });

    pyProcess.stdin.write(text);
    pyProcess.stdin.end();
  });
}

function getModelMetrics() {
  if (fs.existsSync(METRICS_PATH)) {
    try {
      return JSON.parse(fs.readFileSync(METRICS_PATH, 'utf8'));
    } catch (e) {
      return null;
    }
  }
  return null;
}

module.exports = {
  predictTone,
  getModelMetrics
};
