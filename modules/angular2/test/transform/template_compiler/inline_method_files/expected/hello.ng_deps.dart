library examples.src.hello_world.index_common_dart;

import 'hello.dart';
import 'package:angular2/angular2.dart'
    show bootstrap, Component, Decorator, Template, NgElement;

bool _visited = false;
void setupReflection(reflector) {
  if (_visited) return;
  _visited = true;
  reflector
    ..registerType(HelloCmp, {
      'factory': () => new HelloCmp(),
      'parameters': const [const []],
      'annotations': const [
        const Component(selector: 'hello-app'),
        const Template(inline: '<button (click)=\"action()\">go</button>')
      ]
    })
    ..registerMethods(
        {'action': (o, List args) => Function.apply(o.action, args)});
}
