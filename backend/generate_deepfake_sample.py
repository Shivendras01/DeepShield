import os
import sys
import cv2
import numpy as np

sys.path.insert(0, os.path.abspath('C:/Users/lenovo/OneDrive/Desktop/Minor2/DeepShield/backend'))
from screening.video_processor import VideoProcessor
from screening.deepfake import SpatialDeepfakeDetector

# Source video
src_path = 'C:/Users/lenovo/Downloads/1000180783.mp4'
out_dir = 'C:/Users/lenovo/OneDrive/Desktop/Minor2/DeepShield/sample_test_videos'
os.makedirs(out_dir, exist_ok=True)
out_path = os.path.join(out_dir, 'sample_deepfake_faceswap.mp4')

cap = cv2.VideoCapture(src_path)
fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

# Initialize Haar cascade to locate face region
haarcascade_dir = getattr(cv2.data, 'haarcascades', '')
cascade_path = os.path.join(haarcascade_dir, "haarcascade_frontalface_default.xml")
face_cascade = cv2.CascadeClassifier(cascade_path)

fourcc = cv2.VideoWriter_fourcc(*'mp4v')
out = cv2.VideoWriter(out_path, fourcc, fps, (w, h))

frame_count = 0
while cap.isOpened() and frame_count < 150:
    ret, frame = cap.read()
    if not ret:
        break
    
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    faces = face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(100, 100))
    
    if len(faces) > 0:
        fx, fy, fw, fh = max(faces, key=lambda b: b[2] * b[3])
        # Synthesize deepfake manipulation:
        # Extract inner face region (eyes to mouth)
        margin = int(0.12 * fw)
        cx1 = max(0, fx + margin)
        cy1 = max(0, fy + margin)
        cx2 = min(w, fx + fw - margin)
        cy2 = min(h, fy + fh - margin)
        
        inner_face = frame[cy1:cy2, cx1:cx2].copy()
        if inner_face.size > 0:
            # Apply bilateral smoothing + subtle high-frequency GAN artifact grid
            smoothed = cv2.bilateralFilter(inner_face, d=9, sigmaColor=75, sigmaSpace=75)
            # Add slight artificial tone shift typical of GAN color transfer
            hsv = cv2.cvtColor(smoothed, cv2.COLOR_BGR2HSV).astype(np.float32)
            hsv[..., 1] *= 1.25  # Saturation boost in face mask
            hsv[..., 2] *= 1.08  # Slight brightness mismatch
            hsv[..., 1] = np.clip(hsv[..., 1], 0, 255)
            hsv[..., 2] = np.clip(hsv[..., 2], 0, 255)
            synth_face = cv2.cvtColor(hsv.astype(np.uint8), cv2.COLOR_HSV2BGR)
            
            # Create a soft boundary seam mask typical of face-swap blending
            mask = np.zeros((cy2 - cy1, cx2 - cx1), dtype=np.float32)
            cv2.ellipse(mask, ((cx2 - cx1)//2, (cy2 - cy1)//2), ((cx2 - cx1)//2 - 4, (cy2 - cy1)//2 - 4), 0, 0, 360, 1.0, -1)
            mask = cv2.GaussianBlur(mask, (15, 15), 5)
            mask = np.expand_dims(mask, axis=-1)
            
            blended = (synth_face * mask + inner_face * (1.0 - mask)).astype(np.uint8)
            frame[cy1:cy2, cx1:cx2] = blended
    
    out.write(frame)
    frame_count += 1

cap.release()
out.release()
print(f"Synthesized deepfake sample video saved to: {out_path} ({frame_count} frames)")

# Evaluate with DeepShield Spatial Deepfake Detector
vp = VideoProcessor()
frames, idxs, meta = vp.extract_sampled_frames(out_path)
crops, bboxes = vp.extract_face_crops(frames)
weights_path = 'C:/Users/lenovo/OneDrive/Desktop/Minor2/DeepShield/backend/screening/weights/efficientnet_b0_deepshield.pth'
detector = SpatialDeepfakeDetector(weights_path=weights_path)
eval_res = detector.predict(crops)
print("DeepShield Spatial Evaluation:")
print(" - Raw Score:", eval_res["raw_score"])
print(" - Normalised Score:", eval_res["normalised_score"])
print(" - Flagged:", eval_res["flagged"])
print(" - Notes:", eval_res["notes"])
