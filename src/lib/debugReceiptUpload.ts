import { supabase } from '@/integrations/supabase/client';
import { checkoutService } from './checkoutService';

// Debug utility to test receipt upload functionality
export const debugReceiptUpload = async () => {
  try {
    console.log('=== DEBUGGING RECEIPT UPLOAD ===');
    
    // 1. Check authentication
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      console.error('❌ Authentication failed:', userError);
      return { success: false, error: 'Not authenticated' };
    }
    
    console.log('✅ User authenticated:', userData.user.id);
    
    // 2. Check bucket exists and permissions
    const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
    if (bucketError) {
      console.error('❌ Cannot list buckets:', bucketError);
      return { success: false, error: 'Bucket access error' };
    }
    
    const receiptsBucket = buckets.find(b => b.id === 'receipts');
    if (!receiptsBucket) {
      console.error('❌ Receipts bucket not found');
      return { success: false, error: 'Receipts bucket missing' };
    }
    
    console.log('✅ Receipts bucket exists:', receiptsBucket);
    
    // 3. Try to list files (should be empty but test permissions)
    const { data: files, error: listError } = await supabase.storage
      .from('receipts')
      .list(userData.user.id, { limit: 10 });
    
    if (listError) {
      console.error('❌ Cannot list files in user folder:', listError);
    } else {
      console.log('✅ Can access user folder, files:', files?.length || 0);
    }
    
    // 4. Create a test file
    const testContent = 'test receipt upload';
    const testFile = new File([testContent], 'test-receipt.txt', { type: 'text/plain' });
    const fileName = `${userData.user.id}/test_${Date.now()}.txt`;
    
    console.log('🔍 Attempting to upload test file:', fileName);
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('receipts')
      .upload(fileName, testFile, {
        contentType: testFile.type,
        upsert: false
      });
    
    if (uploadError) {
      console.error('❌ Upload failed:', uploadError);
      return { 
        success: false, 
        error: `Upload failed: ${uploadError.message}`,
        details: uploadError
      };
    }
    
    console.log('✅ Test file uploaded successfully:', uploadData);
    
    // 5. Try to get public URL
    const { data: urlData } = supabase.storage
      .from('receipts')
      .getPublicUrl(fileName);
    
    console.log('✅ Public URL generated:', urlData.publicUrl);
    
    // 6. Clean up test file
    const { error: deleteError } = await supabase.storage
      .from('receipts')
      .remove([fileName]);
    
    if (deleteError) {
      console.warn('⚠️ Could not clean up test file:', deleteError);
    } else {
      console.log('✅ Test file cleaned up');
    }
    
    return { 
      success: true, 
      message: 'Receipt upload system is working correctly',
      bucket: receiptsBucket,
      testUrl: urlData.publicUrl
    };
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return { 
      success: false, 
      error: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
};

// Keep the old function name for compatibility but return error
export const testN8nWebhook = async () => {
  return {
    success: false,
    error: 'N8n webhook functionality has been removed. Use configurable webhooks instead.'
  };
};

// Test webhook connection
export const testWebhook = async (webhookUrl: string) => {
  try {
    console.log('=== TESTING WEBHOOK ===');
    
    const result = await checkoutService.testWebhook(webhookUrl);
    
    if (result.success) {
      console.log('✅ Webhook request sent');
      return {
        success: true,
        message: 'Webhook request sent successfully',
        details: result
      };
    } else {
      console.error('❌ Webhook test failed:', result);
      return {
        success: false,
        error: result.error || 'Webhook test failed'
      };
    }
    
  } catch (error) {
    console.error('❌ Webhook test error:', error);
    return {
      success: false,
      error: `Webhook test error: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
};

// Test specific file upload (for real files)
export const testFileUpload = async (file: File) => {
  try {
    console.log('=== TESTING FILE UPLOAD ===');
    console.log('File details:', {
      name: file.name,
      type: file.type,
      size: file.size
    });
    
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      throw new Error('Not authenticated');
    }
    
    const fileExt = file.name.split('.').pop()?.toLowerCase();
    if (!fileExt || !['jpg', 'jpeg', 'png', 'pdf'].includes(fileExt)) {
      throw new Error(`Invalid file type: ${fileExt}. Only JPG, PNG, PDF allowed.`);
    }
    
    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      throw new Error(`File too large: ${file.size} bytes. Max 5MB.`);
    }
    
    const fileName = `${userData.user.id}/test_${Date.now()}.${fileExt}`;
    console.log('Uploading to:', fileName);
    
    const { data, error } = await supabase.storage
      .from('receipts')
      .upload(fileName, file, {
        contentType: file.type,
        upsert: false
      });
    
    if (error) {
      console.error('Upload error:', error);
      throw error;
    }
    
    console.log('✅ File uploaded successfully:', data);
    return { success: true, fileName, data };
    
  } catch (error) {
    console.error('❌ File upload failed:', error);
    throw error;
  }
};