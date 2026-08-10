const OPENCV_URLS = [
  'https://cdn.jsdelivr.net/npm/@simp1e/opencv-js@0.0.1/dist/opencv.min.js',
  'https://cdn.jsdelivr.net/npm/@techstark/opencv-js@5.0.0-release.1/dist/opencv.js',
  'https://docs.opencv.org/4.9.0/opencv.js'
];

let cvReady = null;

export function loadOpenCV() {
  if (cvReady) return cvReady;

  cvReady = tryLoadFromUrls(0);
  return cvReady;
}

function tryLoadFromUrls(index) {
  if (index >= OPENCV_URLS.length) {
    cvReady = null;
    return Promise.reject(new Error('No se pudo cargar OpenCV desde ninguna fuente'));
  }

  return loadScript(OPENCV_URLS[index]).catch(() => tryLoadFromUrls(index + 1));
}

function loadScript(url) {
  return new Promise((resolve, reject) => {
    if (window.cv && window.cv.Mat) {
      resolve(window.cv);
      return;
    }

    const script = document.createElement('script');
    script.src = url;
    script.async = true;

    const timeout = setTimeout(() => {
      script.remove();
      reject(new Error('Timeout loading ' + url));
    }, 30000);

    script.onload = () => {
      clearTimeout(timeout);
      if (window.cv && window.cv.then) {
        window.cv.then(cv => resolve(cv)).catch(reject);
      } else if (window.cv && window.cv.Mat) {
        resolve(window.cv);
      } else if (window.cv) {
        const check = setInterval(() => {
          if (window.cv.Mat) {
            clearInterval(check);
            resolve(window.cv);
          }
        }, 100);
        setTimeout(() => { clearInterval(check); reject(new Error('OpenCV init timeout')); }, 15000);
      } else {
        reject(new Error('OpenCV not found after load'));
      }
    };

    script.onerror = () => {
      clearTimeout(timeout);
      script.remove();
      reject(new Error('Failed to load ' + url));
    };

    document.head.appendChild(script);
  });
}

export function refineContour(cv, imageData, roiRect) {
  const src = cv.matFromImageData(imageData);
  const gray = new cv.Mat();
  const blurred = new cv.Mat();
  const edges = new cv.Mat();
  const dilated = new cv.Mat();

  cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
  cv.GaussianBlur(gray, blurred, new cv.Size(5, 5), 0);
  cv.Canny(blurred, edges, 30, 100);

  const kernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(3, 3));
  cv.dilate(edges, dilated, kernel);
  kernel.delete();

  const roi = dilated.roi(new cv.Rect(roiRect.x, roiRect.y, roiRect.w, roiRect.h));

  const contours = new cv.MatVector();
  const hierarchy = new cv.Mat();
  cv.findContours(roi, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

  const roiArea = roiRect.w * roiRect.h;
  const minArea = roiArea * 0.15;

  let bestContour = null;
  let maxArea = 0;

  for (let i = 0; i < contours.size(); i++) {
    const contour = contours.get(i);
    const area = cv.contourArea(contour);
    if (area > maxArea && area >= minArea) {
      const peri = cv.arcLength(contour, true);
      const approx = new cv.Mat();
      cv.approxPolyDP(contour, approx, 0.04 * peri, true);

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
  dilated.delete(); roi.delete(); contours.delete(); hierarchy.delete();

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
