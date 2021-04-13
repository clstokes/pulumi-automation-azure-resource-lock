import * as pulumi from "@pulumi/pulumi";
import { InlineProgramArgs, LocalWorkspace, Stack, UpResult } from "@pulumi/pulumi/x/automation";

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
 * 
 * Alternatively, a LocalProgram could be used to refer to a project on a local or remote path.
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
    logBanner(message);
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
    logBanner(message);
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
function logBanner(...message: string[]) {
    console.log(`################################################################################`);
    console.log(`#`);
    message.forEach(it => console.log(`# ${it}`));
    console.log(`#`);
    console.log(``);
}

function logError(...message: string[]) {
    console.log(`!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!`);
    console.log(`!`);
    message.forEach(it => console.log(`! ${it}`));
    console.log(`!`);
    console.log(`!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!`);
    console.log(``);
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
        logBanner("destroying main stack...");
        await mainStack.destroy({ onOutput: console.info });
        process.exit(0);
    }

    /**
     * update main pulumi project
     */
    let upRes: UpResult | undefined = undefined;
    try {
        await mainStack.setConfig(locationConfigKey, { value: location });
        logBanner("updating main stack...");
        upRes = await mainStack.up({ onOutput: console.info });
    } catch (err) {
        logError(`Error occurred: ${err}`);
    }
    finally {
        /**
         * Add resource group lock
         */
        if (upRes?.outputs?.resourceGroupName.value) {
            await lock(lockStack, (await mainStack.getConfig(locationConfigKey)).value, upRes.outputs.resourceGroupName.value);
        }
        else {
            console.log(`Output [resourceGroupName] not found from main stack. Unable to lock resource group.`);
            process.exit(1);
        }
    }
};

run().catch(err => console.log(err));
