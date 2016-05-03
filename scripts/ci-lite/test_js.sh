#!/usr/bin/env bash

set -ex -o pipefail

if [[ ${TRAVIS} && ${CI_MODE} != "js" ]]; then
  exit 0;
fi


echo 'travis_fold:start:test.js'

# Setup environment
cd `dirname $0`
source ./env.sh
cd ../..


echo 'travis_fold:start:test.unit.tools'

# Run unit tests in tools
node ./dist/tools/tsc-watch/ tools triggerCmds

echo 'travis_fold:end:test.unit.tools'


echo 'travis_fold:start:test.unit.node'

# Run unit tests in node
node ./dist/tools/tsc-watch/ node triggerCmds

echo 'travis_fold:end:test.unit.node'


echo 'travis_fold:start:test.compiler_cli.node'

# Run compiler_cli integration tests in node
node dist/tools/cjs-jasmine -- @angular/compiler_cli/integrationtest/**/*_spec.js

echo 'travis_fold:end:test.compiler_cli.node'

# rebuild since codegen has overwritten some files.
node dist/all/@angular/compiler_cli/src/main -p modules/tsconfig.json

echo 'travis_fold:start:test.unit.localChrome'

# Run unit tests in local chrome
if [[ ${TRAVIS} ]]; then
  sh -e /etc/init.d/xvfb start
fi

$(npm bin)/karma start ./karma-js.conf.js --single-run --browsers=${KARMA_JS_BROWSERS}
echo 'travis_fold:end:test.unit.localChrome'


echo 'travis_fold:end:test.js'
