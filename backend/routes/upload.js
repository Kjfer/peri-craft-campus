const express = require('express');
const multer = require('multer');
const { authenticateToken, requireInstructor } = require('../middleware/auth');

const router = express.Router();

// Multer configuration for file uploads
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedTypes = (process.env.ALLOWED_FILE_TYPES || 'image/jpeg,image/png,image/webp,video/mp4,video/webm').split(',');
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${file.mimetype} not allowed. Allowed types: ${allowedTypes.join(', ')}`), false);
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, // 10MB default
    files: 5 // Maximum 5 files per upload
  },
  fileFilter: fileFilter
});

// Mock Cloudinary upload function
const mockCloudinaryUpload = (buffer, options = {}) => {
  return new Promise((resolve) => {
    // Simulate upload delay
    setTimeout(() => {
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substr(2, 9);
      
      resolve({
        public_id: `peri-institute/${options.folder || 'general'}/${timestamp}-${randomId}`,
        url: `https://res.cloudinary.com/peri-institute/${options.folder || 'general'}/${timestamp}-${randomId}.jpg`,
        secure_url: `https://res.cloudinary.com/peri-institute/${options.folder || 'general'}/${timestamp}-${randomId}.jpg`,
        format: options.format || 'jpg',
        resource_type: options.resource_type || 'image',
        bytes: buffer.length,
        created_at: new Date().toISOString()
      });
    }, 1000);
  });
};

// @desc    Upload course thumbnail
// @route   POST /api/upload/course-thumbnail
// @access  Private (Instructor/Admin)
router.post('/course-thumbnail', authenticateToken, requireInstructor, upload.single('thumbnail'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }

    // Validate file type
    if (!req.file.mimetype.startsWith('image/')) {
      return res.status(400).json({
        success: false,
        error: 'Only image files are allowed for thumbnails'
      });
    }

    // Upload to Cloudinary (mock)
    const result = await mockCloudinaryUpload(req.file.buffer, {
      folder: 'course-thumbnails',
      resource_type: 'image',
      format: 'jpg'
    });

    res.json({
      success: true,
      message: 'Thumbnail uploaded successfully',
      file: {
        public_id: result.public_id,
        url: result.secure_url,
        size: result.bytes,
        format: result.format,
        uploaded_at: result.created_at
      }
    });

  } catch (error) {
    next(error);
  }
});

// @desc    Upload lesson video
// @route   POST /api/upload/lesson-video
// @access  Private (Instructor/Admin)
router.post('/lesson-video', authenticateToken, requireInstructor, upload.single('video'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }

    // Validate file type
    if (!req.file.mimetype.startsWith('video/')) {
      return res.status(400).json({
        success: false,
        error: 'Only video files are allowed'
      });
    }

    // Upload to Cloudinary (mock)
    const result = await mockCloudinaryUpload(req.file.buffer, {
      folder: 'lesson-videos',
      resource_type: 'video'
    });

    res.json({
      success: true,
      message: 'Video uploaded successfully',
      file: {
        public_id: result.public_id,
        url: result.secure_url,
        size: result.bytes,
        format: result.format,
        uploaded_at: result.created_at
      }
    });

  } catch (error) {
    next(error);
  }
});

// @desc    Upload user avatar
// @route   POST /api/upload/avatar
// @access  Private
router.post('/avatar', authenticateToken, upload.single('avatar'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }

    // Validate file type
    if (!req.file.mimetype.startsWith('image/')) {
      return res.status(400).json({
        success: false,
        error: 'Only image files are allowed for avatars'
      });
    }

    // Upload to Cloudinary (mock)
    const result = await mockCloudinaryUpload(req.file.buffer, {
      folder: 'user-avatars',
      resource_type: 'image',
      format: 'jpg'
    });

    res.json({
      success: true,
      message: 'Avatar uploaded successfully',
      file: {
        public_id: result.public_id,
        url: result.secure_url,
        size: result.bytes,
        format: result.format,
        uploaded_at: result.created_at
      }
    });

  } catch (error) {
    next(error);
  }
});

// @desc    Upload multiple files
// @route   POST /api/upload/multiple
// @access  Private (Instructor/Admin)
router.post('/multiple', authenticateToken, requireInstructor, upload.array('files', 5), async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No files uploaded'
      });
    }

    const uploadPromises = req.files.map(async (file) => {
      const folder = file.mimetype.startsWith('image/') ? 'images' : 
                     file.mimetype.startsWith('video/') ? 'videos' : 'documents';
      
      const result = await mockCloudinaryUpload(file.buffer, {
        folder: folder,
        resource_type: file.mimetype.startsWith('image/') ? 'image' : 
                      file.mimetype.startsWith('video/') ? 'video' : 'raw'
      });

      return {
        original_name: file.originalname,
        public_id: result.public_id,
        url: result.secure_url,
        size: result.bytes,
        format: result.format,
        mimetype: file.mimetype,
        uploaded_at: result.created_at
      };
    });

    const uploadedFiles = await Promise.all(uploadPromises);

    res.json({
      success: true,
      message: `${uploadedFiles.length} files uploaded successfully`,
      files: uploadedFiles
    });

  } catch (error) {
    next(error);
  }
});

// @desc    Delete uploaded file
// @route   DELETE /api/upload/:publicId
// @access  Private (Instructor/Admin)
router.delete('/:publicId', authenticateToken, requireInstructor, async (req, res, next) => {
  try {
    const { publicId } = req.params;

    if (!publicId) {
      return res.status(400).json({
        success: false,
        error: 'Public ID is required'
      });
    }

    // Mock deletion - in real implementation, you would call Cloudinary's destroy method
    console.log(`Mock deletion of file with public_id: ${publicId}`);

    res.json({
      success: true,
      message: 'File deleted successfully',
      deleted_public_id: publicId
    });

  } catch (error) {
    next(error);
  }
});

// @desc    Get file info
// @route   GET /api/upload/info/:publicId
// @access  Private
router.get('/info/:publicId', authenticateToken, async (req, res, next) => {
  try {
    const { publicId } = req.params;

    if (!publicId) {
      return res.status(400).json({
        success: false,
        error: 'Public ID is required'
      });
    }

    // Mock file info - in real implementation, you would get this from Cloudinary
    const fileInfo = {
      public_id: publicId,
      url: `https://res.cloudinary.com/peri-institute/${publicId}.jpg`,
      secure_url: `https://res.cloudinary.com/peri-institute/${publicId}.jpg`,
      format: 'jpg',
      resource_type: 'image',
      bytes: 156789,
      created_at: new Date().toISOString()
    };

    res.json({
      success: true,
      file_info: fileInfo
    });

  } catch (error) {
    next(error);
  }
});

// @desc    Generate signed upload URL (for direct client uploads)
// @route   POST /api/upload/signed-url
// @access  Private (Instructor/Admin)
router.post('/signed-url', authenticateToken, requireInstructor, async (req, res, next) => {
  try {
    const { resource_type = 'image', folder = 'general' } = req.body;

    // Mock signed URL generation
    const timestamp = Math.round(Date.now() / 1000);
    const signature = `mock_signature_${timestamp}`;
    
    const signedUrl = {
      url: 'https://api.cloudinary.com/v1_1/peri-institute/upload',
      public_id: `${folder}/${timestamp}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: timestamp,
      signature: signature,
      api_key: 'mock_api_key',
      folder: folder,
      resource_type: resource_type
    };

    res.json({
      success: true,
      message: 'Signed URL generated successfully',
      upload_data: signedUrl
    });

  } catch (error) {
    next(error);
  }
});

// @desc    Get upload statistics
// @route   GET /api/upload/stats
// @access  Private (Admin)
router.get('/stats', authenticateToken, async (req, res, next) => {
  try {
    // Mock upload statistics
    const stats = {
      total_uploads: 1250,
      total_size: 2.5 * 1024 * 1024 * 1024, // 2.5GB
      uploads_this_month: 85,
      average_file_size: 2.5 * 1024 * 1024, // 2.5MB
      file_types: {
        images: 850,
        videos: 320,
        documents: 80
      },
      storage_usage: {
        used: 2.5 * 1024 * 1024 * 1024, // 2.5GB
        limit: 10 * 1024 * 1024 * 1024, // 10GB
        percentage: 25
      }
    };

    res.json({
      success: true,
      statistics: stats
    });

  } catch (error) {
    next(error);
  }
});

module.exports = router;
