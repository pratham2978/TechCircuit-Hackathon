import { defineConfig, postgres } from "@neon/config/v1";

export default defineConfig({
  // Neon Postgres service — provisions the database and exports DATABASE_URL
  services: {
    db: postgres({
      // The env var name matches what backend/app/config.py reads
      env: "DATABASE_URL",
    }),
  },
  auth: false,
  // Branch policy: per-branch tuning
  branch: (branch) => {
    if (branch.isDefault) {
      // Default branch: no overrides, uses project defaults
      return {};
    }
    if (!branch.exists) {
      // New non-default branches: auto-expire
      // Run `neon checkout <name>` to create a new branch with these settings
      return { ttl: "7d" };
    }
    // Existing branch: no changes
    return {};
  },
});
