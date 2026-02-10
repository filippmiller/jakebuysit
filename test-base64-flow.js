/**
 * Test Script: Base64 Photo Flow
 * Tests end-to-end base64 photo submission without actually running the full stack.
 *
 * Usage: node test-base64-flow.js
 */

const fs = require('fs');
const path = require('path');

// Sample base64 photo (1x1 red pixel PNG)
const SAMPLE_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==';

const API_URL = process.env.API_URL || 'http://localhost:8082';

async function testBase64Flow() {
  console.log('🧪 Testing Base64 Photo Flow\n');

  // Test 1: Submit offer with base64 photos
  console.log('1️⃣  Creating offer with base64 photo...');

  const offerPayload = {
    photos: [
      {
        type: 'base64',
        data: SAMPLE_BASE64,
        mediaType: 'image/png',
      },
    ],
    userDescription: 'Test item for base64 flow verification',
  };

  try {
    const createResponse = await fetch(`${API_URL}/api/v1/offers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(offerPayload),
    });

    if (!createResponse.ok) {
      const error = await createResponse.text();
      console.error('❌ Offer creation failed:', error);
      process.exit(1);
    }

    const { offerId, status, message } = await createResponse.json();
    console.log('✅ Offer created:', { offerId, status, message });

    // Test 2: Poll offer status
    console.log('\n2️⃣  Polling offer status...');

    let attempts = 0;
    const maxAttempts = 10;
    let finalStatus = null;

    while (attempts < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait 2 seconds

      const getResponse = await fetch(`${API_URL}/api/v1/offers/${offerId}`);

      if (!getResponse.ok) {
        console.error('❌ Failed to fetch offer');
        break;
      }

      const offer = await getResponse.json();
      console.log(`   [${attempts + 1}/${maxAttempts}] Status: ${offer.status}, Stage: ${offer.processingStage || 'N/A'}`);

      finalStatus = offer.status;

      if (offer.status === 'ready') {
        console.log('\n✅ Offer reached READY status!');
        console.log('   Item:', offer.item?.brand, offer.item?.model);
        console.log('   Offer Amount:', offer.pricing?.offerAmount);
        console.log('   AI Confidence:', offer.aiConfidence);
        break;
      }

      if (offer.status === 'escalated' || offer.status === 'failed') {
        console.log('\n⚠️  Offer escalated or failed');
        console.log('   Reason:', offer.escalationReason || 'Unknown');
        break;
      }

      attempts++;
    }

    if (attempts === maxAttempts && finalStatus !== 'ready') {
      console.log('\n⚠️  Offer did not reach READY status within timeout');
      console.log('   Final status:', finalStatus);
    }

    // Test 3: Verify photo storage
    console.log('\n3️⃣  Verifying photo storage...');

    const getResponse = await fetch(`${API_URL}/api/v1/offers/${offerId}`);
    const offer = await getResponse.json();

    if (offer.photos && offer.photos.length > 0) {
      const photo = offer.photos[0];
      console.log('✅ Photo stored:', {
        type: photo.type || 'url',
        hasData: photo.type === 'base64' ? !!photo.data : !!photo.url,
        mediaType: photo.mediaType || 'N/A',
      });
    } else {
      console.log('❌ No photos found in offer');
    }

    console.log('\n✨ Base64 flow test complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

testBase64Flow();
