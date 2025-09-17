import { Router } from 'express';
import { ConfigService } from '../services/ConfigService';

export function createConfigRoutes(configService: ConfigService): Router {
  const router = Router();

  // Read codex config (projects)
  router.get('/projects', async (req, res) => {
    try {
      const projects = await configService.readCodexConfig();
      res.json(projects);
    } catch (error) {
      console.error('Failed to read projects:', error);
      res.status(500).json({ error: 'Failed to read projects' });
    }
  });

  // Set project trust
  router.post('/projects/:path/trust', async (req, res) => {
    try {
      const { path: projectPath } = req.params;
      const { trustLevel } = req.body;
      
      if (!trustLevel) {
        return res.status(400).json({ error: 'Missing trustLevel' });
      }

      await configService.setProjectTrust(decodeURIComponent(projectPath), trustLevel);
      res.json({ success: true });
    } catch (error) {
      console.error('Failed to set project trust:', error);
      res.status(500).json({ error: 'Failed to set project trust' });
    }
  });

  // Check if project is version controlled
  router.get('/projects/:path/version-controlled', async (req, res) => {
    try {
      const { path: projectPath } = req.params;
      const isVC = await configService.isVersionControlled(decodeURIComponent(projectPath));
      res.json({ isVersionControlled: isVC });
    } catch (error) {
      console.error('Failed to check version control:', error);
      res.status(500).json({ error: 'Failed to check version control' });
    }
  });

  // Get project name
  router.get('/projects/:path/name', async (req, res) => {
    try {
      const { path: projectPath } = req.params;
      const name = await configService.getProjectName(decodeURIComponent(projectPath));
      res.json({ name });
    } catch (error) {
      console.error('Failed to get project name:', error);
      res.status(500).json({ error: 'Failed to get project name' });
    }
  });

  // Read model providers
  router.get('/providers', async (req, res) => {
    try {
      const providers = await configService.readModelProviders();
      res.json(providers);
    } catch (error) {
      console.error('Failed to read providers:', error);
      res.status(500).json({ error: 'Failed to read providers' });
    }
  });

  // Add or update model provider
  router.put('/providers/:name', async (req, res) => {
    try {
      const { name } = req.params;
      const provider = req.body;
      
      await configService.addOrUpdateModelProvider(name, provider);
      res.json({ success: true });
    } catch (error) {
      console.error('Failed to add/update provider:', error);
      res.status(500).json({ error: 'Failed to add/update provider' });
    }
  });

  // Read profiles
  router.get('/profiles', async (req, res) => {
    try {
      const profiles = await configService.readProfiles();
      res.json(profiles);
    } catch (error) {
      console.error('Failed to read profiles:', error);
      res.status(500).json({ error: 'Failed to read profiles' });
    }
  });

  // Add or update profile
  router.put('/profiles/:name', async (req, res) => {
    try {
      const { name } = req.params;
      const profile = req.body;
      
      await configService.addOrUpdateProfile(name, profile);
      res.json({ success: true });
    } catch (error) {
      console.error('Failed to add/update profile:', error);
      res.status(500).json({ error: 'Failed to add/update profile' });
    }
  });

  // Delete profile
  router.delete('/profiles/:name', async (req, res) => {
    try {
      const { name } = req.params;
      await configService.deleteProfile(name);
      res.json({ success: true });
    } catch (error) {
      console.error('Failed to delete profile:', error);
      res.status(500).json({ error: 'Failed to delete profile' });
    }
  });

  // Get provider config
  router.get('/providers/:name/config', async (req, res) => {
    try {
      const { name } = req.params;
      const config = await configService.getProviderConfig(name);
      res.json(config);
    } catch (error) {
      console.error('Failed to get provider config:', error);
      res.status(500).json({ error: 'Failed to get provider config' });
    }
  });

  // Get profile config
  router.get('/profiles/:name/config', async (req, res) => {
    try {
      const { name } = req.params;
      const config = await configService.getProfileConfig(name);
      res.json(config);
    } catch (error) {
      console.error('Failed to get profile config:', error);
      res.status(500).json({ error: 'Failed to get profile config' });
    }
  });

  // Update profile model
  router.patch('/profiles/:name/model', async (req, res) => {
    try {
      const { name } = req.params;
      const { model } = req.body;
      
      if (!model) {
        return res.status(400).json({ error: 'Missing model' });
      }

      await configService.updateProfileModel(name, model);
      res.json({ success: true });
    } catch (error) {
      console.error('Failed to update profile model:', error);
      res.status(500).json({ error: 'Failed to update profile model' });
    }
  });

  return router;
}