/* Camera frames never leave this worker. Assets are served from this app. */
importScripts('/mediapipe/vision_bundle.js');
let tracker;
self.onmessage = async ({ data }) => {
  try {
    if (data.type === 'init') {
      const vision =
        await Vision.FilesetResolver.forVisionTasks('/mediapipe/wasm');
      tracker = await Vision.HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: '/models/hand_landmarker.task',
          delegate: 'CPU',
        },
        runningMode: 'VIDEO',
        numHands: 2,
        minHandDetectionConfidence: 0.65,
        minHandPresenceConfidence: 0.65,
        minTrackingConfidence: 0.65,
      });
      self.postMessage({ type: 'ready' });
    } else if (data.type === 'frame') {
      try {
        const result = tracker.detectForVideo(data.bitmap, data.time);
        const hands = result.landmarks.map((points, i) => ({
          id: result.handedness[i]?.[0]?.categoryName || String(i),
          points: points.map((p) => ({ x: 1 - p.x, y: p.y, z: p.z })),
        }));
        self.postMessage({ type: 'hands', hands });
      } finally {
        data.bitmap.close();
      }
    }
  } catch (error) {
    self.postMessage({
      type: 'error',
      message: 'Hand tracking failed: ' + error.message,
    });
  }
};
