(function (WF) {
  'use strict';

  function positionCanvasStage(stage, total, panX, panY) {
    stage.style.position = 'absolute';
    stage.style.left = '50%';
    stage.style.top = '50%';
    stage.style.transform = `translate(-50%, -50%) translate(${panX}px, ${panY}px) scale(${total})`;
  }

  WF.positionCanvasStage = positionCanvasStage;
})(window.WF = window.WF || {});
