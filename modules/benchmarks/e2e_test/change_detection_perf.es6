"use strict";
var benchpress = require('../../../tools/benchpress/index.js');

describe('ng2 change detection benchmark', function () {

  var URL = 'benchmarks/web/change_detection/change_detection_benchmark.html';

  afterEach(benchpress.verifyNoBrowserErrors);

  it('should log ng stats', function() {
    browser.get(URL);
    runClickBenchmark({
      buttons: ['#ng2DetectChanges'],
      logId: 'ng2.changeDetection'
    });
  });

  it('should log baseline stats', function() {
    browser.get(URL);
    runClickBenchmark({
      buttons: ['#baselineDetectChanges'],
      logId: 'baseline.changeDetection'
    });
  });

});

function runClickBenchmark(config) {
  var buttons = config.buttons.map(function(selector) {
    return $(selector);
  });
  var timeParams = browser.params.benchmark;
  benchpress.runBenchmark({
    sampleSize: timeParams.sampleSize,
    targetCoefficientOfVariation: timeParams.targetCoefficientOfVariation,
    timeout: timeParams.timeout,
    metrics: timeParams.metrics,
    logId: browser.params.lang+'.'+config.logId
  }, function() {
    buttons.forEach(function(button) {
      button.click();
    });
  });
}
