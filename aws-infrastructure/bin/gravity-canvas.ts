#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { GravityCanvasStack } from '../lib/gravity-canvas-stack';

const app = new cdk.App();

const environment = app.node.tryGetContext('environment') || 'dev';
const region = app.node.tryGetContext('region') || 'us-east-1';
const account = app.node.tryGetContext('account');

if (!account) {
  throw new Error('Account must be specified in context');
}

new GravityCanvasStack(app, `GravityCanvas-${environment}`, {
  env: {
    account,
    region
  },
  environment,
  tags: {
    Project: 'GravityCanvas',
    Environment: environment,
    ManagedBy: 'CDK'
  }
});
