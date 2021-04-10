import * as pulumi from "@pulumi/pulumi";
import { InlineProgramArgs, LocalWorkspace, Stack } from "@pulumi/pulumi/x/automation";

import * as authorizationEnums from "@pulumi/azure-native/types/enums/authorization";
import * as authorization from "@pulumi/azure-native/authorization";
import * as resources from "@pulumi/azure-native/resources";

const process = require('process');

/**
 * Config and Arguments
 */
const stackName = "dev";
const locationConfigKey = "azure-native:location";
const location = "WestUS";

const args = process.argv.slice(2);
let destroy = false;
if (args.length > 0 && args[0]) {
    destroy = args[0] === "destroy";
}

/**
 * Inline programs
 */
const lockProgram = async () => {
    const config = new pulumi.Config();
    new authorization.ManagementLockAtResourceGroupLevel("resourceGroup", {
        resourceGroupName: config.require("resourceGroupName"),
        level: authorizationEnums.LockLevel.ReadOnly,
    });
};

const resourceGroupProgram = async () => {
    const resourceGroup = new resources.ResourceGroup("main");
    return {
        resourceGroupName: resourceGroup.name,
    };
};

/**
 * destroy resource group lock
 */
const unlock = async (): Promise<Stack> => {
    const message = "Removing resource group lock";
    banner(message);
    const lockProgramArgs: InlineProgramArgs = {
        program: lockProgram,
        projectName: "resource-group-lock",
        stackName: stackName,
    };
    const lockStack = await LocalWorkspace.createOrSelectStack(lockProgramArgs);
    await lockStack.destroy({
        message: message,
        onOutput: console.info,
    });
    return lockStack;
};

/**
 * update resource group lock
 */
const lock = async (lockStack: Stack, location: string, resourceGroupName: string) => {
    const message = "Adding resource group lock";
    banner(message);
    await lockStack.setConfig(locationConfigKey, { value: location });
    await lockStack.setConfig("resourceGroupName", { value: resourceGroupName });
    await lockStack.up({
        message: message,
        onOutput: console.info,
    });
};

/**
 * Print a message to the console with a "banner" outline.
 */
function banner(...message: string[]) {
    console.log(`################################################################################`);
    console.log(`#`);
    message.forEach(it => console.log(`# ${it}`));
    console.log(`#`);
}

const run = async () => {

    /**
     * Remove resource group lock
     */
    const lockStack = await unlock();

    /**
     * main pulumi project
     */
    const mainProgramArgs: InlineProgramArgs = {
        program: resourceGroupProgram,
        projectName: "resource-group",
        stackName: stackName,
    };
    const mainStack = await LocalWorkspace.createOrSelectStack(mainProgramArgs);

    if (destroy) {
        /**
         * destroy main pulumi project
         */
        banner("destroying main stack...");
        await mainStack.destroy({ onOutput: console.info });
        process.exit(0);
    }

    /**
     * update main pulumi project
     */
    await mainStack.setConfig(locationConfigKey, { value: location });
    banner("updating main stack...");
    const upRes = await mainStack.up({ onOutput: console.info });

    /**
     * Add resource group lock
     */
    await lock(lockStack, (await mainStack.getConfig(locationConfigKey)).value, upRes.outputs.resourceGroupName.value);
};

run().catch(err => console.log(err));
