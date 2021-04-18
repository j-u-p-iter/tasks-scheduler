import { InvalidPathError } from "@j.u.p.iter/custom-error";
import { findPathToFile } from "@j.u.p.iter/find-path-to-file";
import { SystemErrorCode } from "@j.u.p.iter/system-error-code";
import { isValidCron } from "cron-validator";
import fs from "fs";
import cron from "node-cron";
import path from "path";
import * as tsNode from "ts-node";
import { BaseTask } from "./BaseTask";

export class TasksScheduler {
  private resolvedTasksPath = null;

  private appRootPath = null;

  /**
   * Tasks folder path can be either absolute or relative
   *   (relative to the app root folder).
   *
   * We need to make it relative if it's absolute, to be
   *   able to work with this in a consistent way.
   *
   */
  private async absolutePathToRelative(pathToModify) {
    const appRootFolderPath = await this.getAppRootFolderPath();
    /**
     * appRootFolderPath is always absolute path.
     *   If pathToModify is also an absolute,
     *   we get the relative path to the app root folder in the end.
     *
     */
    return pathToModify.replace(appRootFolderPath, "");
  }

  /**
   * Detects the root path to the project by location of
   *   the "package.json" file internally.
   *
   */
  private async getAppRootFolderPath() {
    if (this.appRootPath) {
      return this.appRootPath;
    }

    const { dirPath } = await findPathToFile("package.json");

    this.appRootPath = dirPath;

    return this.appRootPath;
  }

  private async resolvePathToTasksFolder() {
    if (this.resolvedTasksPath) {
      return this.resolvedTasksPath;
    }

    const appRootFolderPath = await this.getAppRootFolderPath();
    const tasksFolderPath = await this.absolutePathToRelative(
      this.tasksFolderPath
    );

    this.resolvedTasksPath = path.join(appRootFolderPath, tasksFolderPath);

    return this.resolvedTasksPath;
  }

  private initializeTask(taskEntry: string): BaseTask {
    const pathToTask = path.resolve(this.resolvedTasksPath, taskEntry);
    const Task = require(pathToTask).default;

    if (!Task) {
      throw new Error(`Task in "${taskEntry}" task file was not declared.`);
    }

    const task = new Task();

    return task;
  }

  private scheduleTask(task) {
    const schedule = task.schedule();

    if (schedule === null) {
      throw new Error(`The task "${task.name}" should declare schedule`);
    }

    if (!isValidCron(schedule)) {
      throw new Error(
        `The task "${task.name}" declares invalid schedule ${schedule}`
      );
    }

    if (task.run() === null) {
      throw new Error(`The task "${task.name}" should declare run method`);
    }

    cron.schedule(task.schedule(), task.run);

    console.log(`Task "${task.name}" was scheduled`);
  }

  /**
   * The tasksFolderPath should be relative to the
   *   application root folder or absolute.
   *
   */
  constructor(private tasksFolderPath: string) {
    tsNode.register();
  }

  /**
   * Scans tasks folder to find all folder entries
   */
  async scanTasksFolder() {
    const allowedExtensions = [".ts"];
    const tasksFolderPath = await this.resolvePathToTasksFolder();

    let entries;

    try {
      entries = await fs.promises.readdir(tasksFolderPath);
    } catch (error) {
      if (error.code === SystemErrorCode.NO_FILE_OR_DIRECTORY) {
        throw new InvalidPathError(tasksFolderPath, {
          context: "@j.u.p.iter/tasks-scheduler"
        });
      }
    }

    return entries.filter(entry => {
      return allowedExtensions.includes(path.extname(entry));
    });
  }

  async run() {
    console.log("Start running tasks...");

    const tasksEntries = await this.scanTasksFolder();

    if (!tasksEntries.length) {
      console.log(
        `There are no tasks in the tasks folder: ${this.resolvedTasksPath}. Stop tasks scheduler.`
      );

      return;
    }

    tasksEntries.forEach(taskEntry => {
      const task = this.initializeTask(taskEntry);

      this.scheduleTask(task);
    });
  }
}
