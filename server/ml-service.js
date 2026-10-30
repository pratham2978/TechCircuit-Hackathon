const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

const SCRIPT_PATH = path.join(__dirname, '..', 'ml', 'predict.py');
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

  return new Promise((resolve) => {
    const pythonCmd = process.env.PYTHON_CMD || (process.platform === 'win32' ? 'python' : 'python3');
    const pyProcess = spawn(pythonCmd, [SCRIPT_PATH, text], {
      cwd: path.join(__dirname, '..', 'ml'),
      env: { ...process.env, PYTHONIOENCODING: 'utf-8' }
    });

    let stdoutData = '';
    let stderrData = '';

    const timer = setTimeout(() => {
      pyProcess.kill();
      resolve({
        predicted_tone: 'Professional',
        confidence: 0.5,
        probabilities: {},
        model_version: 'v1.0-local-sklearn-timeout-fallback',
        status: 'timeout'
      });
    }, 30000);

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
            predicted_tone: 'Professional',
            confidence: 0.5,
            error: `Failed to parse ML response: ${e.message}`,
            model_version: 'v1.0-local-sklearn',
            status: 'parse_error'
          });
        }
      } else {
        resolve({
          predicted_tone: 'Professional',
          confidence: 0.5,
          error: stderrData || `Python process exited with code ${code}`,
          model_version: 'v1.0-local-sklearn',
          status: 'process_error'
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
