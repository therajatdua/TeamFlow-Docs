// Test Firebase integration on the frontend
// This should be run in the browser console

async function testFirebaseIntegration() {
  console.log('🔥 Testing Firebase Integration...');
  
  try {
    // Check if Firebase is loaded
    if (typeof firebase === 'undefined') {
      console.log('❌ Firebase not loaded globally');
      return;
    }
    
    // Test our Firebase wrapper
    const { getFirebaseAuth } = await import('./src/lib/firebase.js');
    const auth = getFirebaseAuth();
    
    if (!auth) {
      console.log('⚠️  Firebase disabled in environment');
      return;
    }
    
    console.log('✅ Firebase auth initialized');
    console.log('Current user:', auth.currentUser);
    
    // Test password reset (will require valid email)
    const testEmail = 'test@example.com';
    console.log(`Testing password reset for ${testEmail}...`);
    
    try {
      await auth.sendPasswordResetEmail(testEmail);
      console.log('✅ Password reset email sent (check spam folder)');
    } catch (error) {
      console.log('Password reset error:', error.code, error.message);
      if (error.code === 'auth/user-not-found') {
        console.log('✅ Password reset properly handles non-existent users');
      }
    }
    
    console.log('🎉 Firebase integration test complete!');
    
  } catch (error) {
    console.error('❌ Firebase test failed:', error);
  }
}

// Export for use in browser console
if (typeof window !== 'undefined') {
  window.testFirebaseIntegration = testFirebaseIntegration;
}

testFirebaseIntegration();
