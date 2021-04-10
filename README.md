# pulumi-automation-azure-resource-lock

This project demonstrates how you can use the [Pulumi Automation API](https://www.pulumi.com/blog/automation-api/) to manage a [Azure resource locks](https://docs.microsoft.com/en-us/azure/azure-resource-manager/management/lock-resources) during a Pulumi deployment.

During an `up`, the `pulumi.ts` does the following:

1. runs `destroy` on the stack containing the `ManagementLockAtResourceGroupLevel` resource
1. runs `up` on the main stack
1. runs `up` on the stack containing the `ManagementLockAtResourceGroupLevel` resource

During an `destroy`, the `pulumi.ts` does the following:

1. runs `destroy` on the stack containing the `ManagementLockAtResourceGroupLevel` resource
1. runs `destroy` on the main stack

## Prerequisites

- You will need the [Pulumi CLI](https://www.pulumi.com/docs/get-started/install/) installed.
- This particular project uses TypeScript so you will need [Node.js](https://nodejs.org/en/download/) installed. This same automation application could be implemented in any of other languages that Pulumi supports.

## Usage

The automation application supports `up` and `destroy` operations.

1. `npm install`
1. `npm run pulumi`
1. `npm run pulumi destroy`

## Example Output

```
% npm run pulumi        

> pulumi-automation-azure-resource-lock@0.0.1 pulumi
> ./node_modules/ts-node/dist/bin.js pulumi.ts

################################################################################
#
# Removing resource group lock
#
Destroying (dev)


View Live: https://app.pulumi.com/clstokes/resource-group-lock/dev/updates/40




 
Resources:

Duration: 1s


The resources in the stack have been deleted, but the history and configuration associated with the stack are still maintained. 
If you want to remove the stack completely, run 'pulumi stack rm dev'.

################################################################################
#
# updating main stack...
#
Updating (dev)


View Live: https://app.pulumi.com/clstokes/resource-group/dev/updates/25




 +  pulumi:pulumi:Stack resource-group-dev creating 

 +  azure-native:resources:ResourceGroup main creating 

 +  azure-native:resources:ResourceGroup main created 

 +  pulumi:pulumi:Stack resource-group-dev created 
 

Outputs:
    resourceGroupName: "main982270d9"

Resources:
    + 2 created

Duration: 6s


################################################################################
#
# Adding resource group lock
#
Updating (dev)


View Live: https://app.pulumi.com/clstokes/resource-group-lock/dev/updates/41




 +  pulumi:pulumi:Stack resource-group-lock-dev creating 

 +  azure-native:authorization:ManagementLockAtResourceGroupLevel resourceGroup creating 

 +  azure-native:authorization:ManagementLockAtResourceGroupLevel resourceGroup created 

 +  pulumi:pulumi:Stack resource-group-lock-dev created 
 

Resources:
    + 2 created

Duration: 5s
```
