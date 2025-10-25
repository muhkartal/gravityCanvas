import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecsPatterns from 'aws-cdk-lib/aws-ecs-patterns';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as elasticache from 'aws-cdk-lib/aws-elasticache';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as certificatemanager from 'aws-cdk-lib/aws-certificatemanager';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as route53Targets from 'aws-cdk-lib/aws-route53-targets';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';

interface GravityCanvasStackProps extends cdk.StackProps {
  environment: string;
}

export class GravityCanvasStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: GravityCanvasStackProps) {
    super(scope, id, props);

    const { environment } = props;

    const vpc = new ec2.Vpc(this, 'GravityCanvasVPC', {
      maxAzs: 2,
      natGateways: environment === 'prod' ? 2 : 1,
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'public-subnet',
          subnetType: ec2.SubnetType.PUBLIC,
        },
        {
          cidrMask: 24,
          name: 'private-subnet',
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
        },
        {
          cidrMask: 28,
          name: 'isolated-subnet',
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
        },
      ],
    });

    const databaseSecret = new secretsmanager.Secret(this, 'DatabaseSecret', {
      generateSecretString: {
        secretStringTemplate: JSON.stringify({ username: 'postgres' }),
        generateStringKey: 'password',
        excludeCharacters: '"@/\\',
      },
    });

    const jwtSecret = new secretsmanager.Secret(this, 'JWTSecret', {
      generateSecretString: {
        secretStringTemplate: JSON.stringify({}),
        generateStringKey: 'jwt-secret',
        passwordLength: 64,
        excludeCharacters: '"@/\\',
      },
    });

    const redisSecret = new secretsmanager.Secret(this, 'RedisSecret', {
      generateSecretString: {
        secretStringTemplate: JSON.stringify({}),
        generateStringKey: 'redis-password',
        passwordLength: 32,
        excludeCharacters: '"@/\\',
      },
    });

    const dbSubnetGroup = new rds.SubnetGroup(this, 'DatabaseSubnetGroup', {
      vpc,
      description: 'Subnet group for Gravity Canvas database',
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
      },
    });

    const database = new rds.DatabaseInstance(this, 'GravityCanvasDB', {
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_15,
      }),
      instanceType: environment === 'prod' 
        ? ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.SMALL)
        : ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO),
      credentials: rds.Credentials.fromSecret(databaseSecret),
      vpc,
      subnetGroup: dbSubnetGroup,
      databaseName: 'gravity_canvas',
      allocatedStorage: environment === 'prod' ? 100 : 20,
      storageEncrypted: true,
      multiAz: environment === 'prod',
      autoMinorVersionUpgrade: true,
      backupRetention: environment === 'prod' ? cdk.Duration.days(7) : cdk.Duration.days(1),
      deletionProtection: environment === 'prod',
      monitoringInterval: environment === 'prod' ? cdk.Duration.seconds(60) : undefined,
      enablePerformanceInsights: environment === 'prod',
    });

    const redisSubnetGroup = new elasticache.CfnSubnetGroup(this, 'RedisSubnetGroup', {
      description: 'Subnet group for Redis cache',
      subnetIds: vpc.isolatedSubnets.map(subnet => subnet.subnetId),
    });

    const redisSecurityGroup = new ec2.SecurityGroup(this, 'RedisSecurityGroup', {
      vpc,
      description: 'Security group for Redis cache',
      allowAllOutbound: false,
    });

    const redis = new elasticache.CfnCacheCluster(this, 'GravityCanvasRedis', {
      cacheNodeType: environment === 'prod' ? 'cache.t3.small' : 'cache.t3.micro',
      engine: 'redis',
      numCacheNodes: 1,
      cacheSubnetGroupName: redisSubnetGroup.ref,
      vpcSecurityGroupIds: [redisSecurityGroup.securityGroupId],
      authToken: redisSecret.secretValueFromJson('redis-password').unsafeUnwrap(),
      transitEncryptionEnabled: true,
      atRestEncryptionEnabled: true,
    });

    const cluster = new ecs.Cluster(this, 'GravityCanvasCluster', {
      vpc,
      containerInsights: environment === 'prod',
    });

    const taskRole = new iam.Role(this, 'TaskRole', {
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AmazonECSTaskExecutionRolePolicy'),
      ],
    });

    databaseSecret.grantRead(taskRole);
    jwtSecret.grantRead(taskRole);
    redisSecret.grantRead(taskRole);

    const logGroup = new logs.LogGroup(this, 'GravityCanvasLogGroup', {
      retention: environment === 'prod' ? logs.RetentionDays.ONE_MONTH : logs.RetentionDays.ONE_WEEK,
    });

    const backendService = new ecsPatterns.ApplicationLoadBalancedFargateService(this, 'BackendService', {
      cluster,
      cpu: environment === 'prod' ? 1024 : 512,
      memoryLimitMiB: environment === 'prod' ? 2048 : 1024,
      desiredCount: environment === 'prod' ? 2 : 1,
      taskImageOptions: {
        image: ecs.ContainerImage.fromRegistry('gravity-canvas-backend:latest'),
        containerPort: 3001,
        taskRole,
        environment: {
          NODE_ENV: environment,
          PORT: '3001',
          HOST: '0.0.0.0',
          DATABASE_HOST: database.instanceEndpoint.hostname,
          DATABASE_PORT: '5432',
          DATABASE_NAME: 'gravity_canvas',
          REDIS_HOST: redis.attrRedisEndpointAddress,
          REDIS_PORT: '6379',
          CORS_ORIGIN: 'https://gravity-canvas.com',
          SOCKET_IO_CORS_ORIGIN: 'https://gravity-canvas.com',
        },
        secrets: {
          DATABASE_PASSWORD: ecs.Secret.fromSecretsManager(databaseSecret, 'password'),
          JWT_SECRET: ecs.Secret.fromSecretsManager(jwtSecret, 'jwt-secret'),
          REDIS_PASSWORD: ecs.Secret.fromSecretsManager(redisSecret, 'redis-password'),
        },
        logDriver: ecs.LogDrivers.awsLogs({
          streamPrefix: 'gravity-canvas-backend',
          logGroup,
        }),
      },
      publicLoadBalancer: true,
      enableExecuteCommand: environment !== 'prod',
    });

    database.connections.allowDefaultPortFrom(backendService.service);
    redisSecurityGroup.addIngressRule(
      ec2.Peer.securityGroupId(backendService.service.connections.securityGroups[0].securityGroupId),
      ec2.Port.tcp(6379),
      'Allow backend to connect to Redis'
    );

    const frontendBucket = new s3.Bucket(this, 'FrontendBucket', {
      websiteIndexDocument: 'index.html',
      websiteErrorDocument: 'index.html',
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      versioned: environment === 'prod',
    });

    const originAccessIdentity = new cloudfront.OriginAccessIdentity(this, 'OAI');
    frontendBucket.grantRead(originAccessIdentity);

    const distribution = new cloudfront.Distribution(this, 'FrontendDistribution', {
      defaultBehavior: {
        origin: new origins.S3Origin(frontendBucket, {
          originAccessIdentity,
        }),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        compress: true,
      },
      additionalBehaviors: {
        '/api/*': {
          origin: new origins.HttpOrigin(backendService.loadBalancer.loadBalancerDnsName, {
            protocolPolicy: cloudfront.OriginProtocolPolicy.HTTP_ONLY,
          }),
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
          originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
        },
      },
      errorResponses: [
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
        },
        {
          httpStatus: 403,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
        },
      ],
      priceClass: environment === 'prod' ? cloudfront.PriceClass.PRICE_CLASS_ALL : cloudfront.PriceClass.PRICE_CLASS_100,
      enableIpv6: true,
    });

    new cdk.CfnOutput(this, 'DatabaseEndpoint', {
      value: database.instanceEndpoint.hostname,
      description: 'RDS PostgreSQL endpoint',
    });

    new cdk.CfnOutput(this, 'RedisEndpoint', {
      value: redis.attrRedisEndpointAddress,
      description: 'ElastiCache Redis endpoint',
    });

    new cdk.CfnOutput(this, 'BackendURL', {
      value: `https://${backendService.loadBalancer.loadBalancerDnsName}`,
      description: 'Backend API URL',
    });

    new cdk.CfnOutput(this, 'FrontendURL', {
      value: `https://${distribution.distributionDomainName}`,
      description: 'Frontend CloudFront URL',
    });

    new cdk.CfnOutput(this, 'S3BucketName', {
      value: frontendBucket.bucketName,
      description: 'S3 bucket for frontend assets',
    });

    new cdk.CfnOutput(this, 'CloudFrontDistributionId', {
      value: distribution.distributionId,
      description: 'CloudFront distribution ID',
    });
  }
}
