const express = require('express');
const cronManager = require('../services/cronJobs');
const router = express.Router();

// GET /api/admin/cron/status - Ver estado de todos los jobs
router.get('/status', async (req, res) => {
  try {
    const status = cronManager.getJobsStatus();
    res.json({
      success: true,
      jobs: status,
      environment: process.env.NODE_ENV,
      cronEnabled: process.env.ENABLE_CRON_JOBS === 'true' || process.env.NODE_ENV === 'production'
    });
  } catch (error) {
    console.error('Error getting cron status:', error);
    res.status(500).json({ error: 'Error getting cron status' });
  }
});

// POST /api/admin/cron/run/:jobName - Ejecutar job manualmente
router.post('/run/:jobName', async (req, res) => {
  try {
    const { jobName } = req.params;
    const result = await cronManager.runJobManually(jobName);
    
    if (result.success) {
      res.json({
        success: true,
        message: `Job ${jobName} executed successfully`,
        result: result.result
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('Error running cron job:', error);
    res.status(500).json({ error: 'Error executing cron job' });
  }
});

// POST /api/admin/cron/start/:jobName - Iniciar job
router.post('/start/:jobName', async (req, res) => {
  try {
    const { jobName } = req.params;
    cronManager.startJob(jobName);
    res.json({
      success: true,
      message: `Job ${jobName} started`
    });
  } catch (error) {
    console.error('Error starting cron job:', error);
    res.status(500).json({ error: 'Error starting cron job' });
  }
});

// POST /api/admin/cron/stop/:jobName - Detener job
router.post('/stop/:jobName', async (req, res) => {
  try {
    const { jobName } = req.params;
    cronManager.stopJob(jobName);
    res.json({
      success: true,
      message: `Job ${jobName} stopped`
    });
  } catch (error) {
    console.error('Error stopping cron job:', error);
    res.status(500).json({ error: 'Error stopping cron job' });
  }
});

module.exports = router;