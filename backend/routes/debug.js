const express = require('express');
const { supabaseAdmin } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Debug endpoint to test cart functionality
router.get('/test-cart', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    console.log('🐛 Debug: Testing cart for user:', userId);
    
    const response = {
      user: {
        id: req.user.id,
        email: req.user.email
      },
      tests: {}
    };
    
    // Test 1: Check if cart_items table exists
    try {
      const { data: cartTest, error: cartError } = await supabaseAdmin
        .from('cart_items')
        .select('*')
        .eq('user_id', userId)
        .limit(1);
      
      response.tests.cart_table = {
        success: !cartError,
        error: cartError?.message,
        data: cartTest
      };
    } catch (e) {
      response.tests.cart_table = {
        success: false,
        error: e.message
      };
    }
    
    // Test 2: Check courses table
    try {
      const { data: coursesTest, error: coursesError } = await supabaseAdmin
        .from('courses')
        .select('id, title, price, is_active')
        .eq('is_active', true)
        .limit(3);
      
      response.tests.courses_table = {
        success: !coursesError,
        error: coursesError?.message,
        data: coursesTest
      };
    } catch (e) {
      response.tests.courses_table = {
        success: false,
        error: e.message
      };
    }
    
    // Test 3: Try to add a course to cart if courses exist
    if (response.tests.courses_table.success && response.tests.courses_table.data?.length > 0) {
      try {
        const testCourse = response.tests.courses_table.data[0];
        
        const { data: addTest, error: addError } = await supabaseAdmin
          .from('cart_items')
          .insert({
            user_id: userId,
            course_id: testCourse.id
          })
          .select()
          .single();
        
        response.tests.add_to_cart = {
          success: !addError,
          error: addError?.message,
          data: addTest
        };
        
        // Clean up - remove the test item
        if (!addError) {
          await supabaseAdmin
            .from('cart_items')
            .delete()
            .eq('id', addTest.id);
        }
        
      } catch (e) {
        response.tests.add_to_cart = {
          success: false,
          error: e.message
        };
      }
    }
    
    res.json(response);
    
  } catch (error) {
    console.error('Debug endpoint error:', error);
    res.status(500).json({
      error: error.message,
      stack: error.stack
    });
  }
});

module.exports = router;
