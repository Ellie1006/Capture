const OPENCV_URL = 'https://docs.opencv.org/4.10.0/opencv.js';

let cvReady = null;

export function loadOpenCV() {
  if (cvReady) return cvReady;

  cvReady = new Promise((resolve, reject) => {
    if (window.cv && window.cv.Mat) {
      resolve(window.cv);
      return;
    }

    const script = document.createElement('script');
    script.src = OPENCV_URL;
    script.async = true;

    script.onload = () => {
      if (window.cv && window.cv.then) {
        window.cv.then(cv => resolve(cv));
      } else if (window.cv) {
        resolve(window.cv);
      } else {
        reject(new Error('OpenCV.js loaded but cv not found'));
      }
    };

    script.onerror = () => {
      cvReady = null;
      reject(new Error('Failed to load OpenCV.js'));
    };

    document.head.appendChild(script);
  });

  return cvReady;
}

export function refineContour(cv, imageData, roiRect) {
  const src = cv.matFromImageData(imageData);
  const gray = new cv.Mat();
  const blurred = new cv.Mat();
  const edges = new cv.Mat();

  cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
  cv.GaussianBlur(gray, blurred, new cv.Size(5, 5), 0);
  cv.Canny(blurred, edges, 50, 150);

  const roi = edges.roi(new cv.Rect(roiRect.x, roiRect.y, roiRect.w, roiRect.h));

  const contours = new cv.MatVector();
  const hierarchy = new cv.Mat();
  cv.findContours(roi, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

  let bestContour = null;
  let maxArea = 0;

  for (let i = 0; i < contours.size(); i++) {
    const contour = contours.get(i);
    const area = cv.contourArea(contour);
    if (area > maxArea) {
      const peri = cv.arcLength(contour, true);
      const approx = new cv.Mat();
      cv.approxPolyDP(contour, approx, 0.02 * peri, true);

      if (approx.rows === 4) {
        maxArea = area;
        if (bestContour) bestContour.delete();
        bestContour = approx;
      } else {
        approx.delete();
      }
    }
  }

  let corners = null;
  if (bestContour) {
    corners = [];
    for (let i = 0; i < 4; i++) {
      corners.push({
        x: bestContour.data32S[i * 2] + roiRect.x,
        y: bestContour.data32S[i * 2 + 1] + roiRect.y
      });
    }
    corners = orderCorners(corners);
    bestContour.delete();
  }

  src.delete(); gray.delete(); blurred.delete(); edges.delete();
  roi.delete(); contours.delete(); hierarchy.delete();

  return corners;
}

function orderCorners(pts) {
  const sorted = [...pts].sort((a, b) => a.y - b.y);
  const top = sorted.slice(0, 2).sort((a, b) => a.x - b.x);
  const bottom = sorted.slice(2, 4).sort((a, b) => a.x - b.x);
  return [top[0], top[1], bottom[1], bottom[0]];
}

export function warpPerspective(cv, imageData, srcCorners, outputWidth, outputHeight) {
  const src = cv.matFromImageData(imageData);

  const srcPts = cv.matFromArray(4, 1, cv.CV_32FC2, [
    srcCorners[0].x, srcCorners[0].y,
    srcCorners[1].x, srcCorners[1].y,
    srcCorners[2].x, srcCorners[2].y,
    srcCorners[3].x, srcCorners[3].y
  ]);

  const dstPts = cv.matFromArray(4, 1, cv.CV_32FC2, [
    0, 0,
    outputWidth, 0,
    outputWidth, outputHeight,
    0, outputHeight
  ]);

  const M = cv.getPerspectiveTransform(srcPts, dstPts);
  const dst = new cv.Mat();
  cv.warpPerspective(src, dst, M, new cv.Size(outputWidth, outputHeight));

  const canvas = document.createElement('canvas');
  canvas.width = outputWidth;
  canvas.height = outputHeight;
  cv.imshow(canvas, dst);

  src.delete(); srcPts.delete(); dstPts.delete(); M.delete(); dst.delete();

  return canvas;
}
