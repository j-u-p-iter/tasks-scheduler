import path from 'path';
import { ensureDir, remove } from 'fs-extra';
import { InvalidPathError } from "@j.u.p.iter/custom-error";
import { TasksScheduler } from './TasksScheduler';

//const TASK_1_NAME = 'Task.js';
//const TASK_2_NAME = 'Task.ts';
//const TASK_3_NAME = 'Task.txt';

const TASKS_FOLDER_NAME = 'tasks';

const tasksFolderPath = path.join(__dirname, TASKS_FOLDER_NAME);

const createTasksFolder = () => ensureDir(tasksFolderPath);

describe('TasksScheduler', () => {
  afterEach(async () => {
    await remove(tasksFolderPath);
  });

  it('logs running indication message in the beginning', async () => {
    console.log = jest.fn();

    await createTasksFolder();

    const tasksScheduler = new TasksScheduler(tasksFolderPath);

    tasksScheduler.run();

    expect(console.log).toHaveBeenCalledWith('Start running tasks...');
  });

  describe('when there is no tasks folder by the provided path', () => {
    it('throws an appropriate error properly', () => {
      const tasksScheduler = new TasksScheduler('./someInvalidPath');

      const runTasksResult = tasksScheduler.run();

      expect(runTasksResult).rejects.toThrow(InvalidPathError);
      expect(runTasksResult).rejects.toThrow(
        'File /Users/j.u.p.iter/projects/tasks-scheduler/someInvalidPath does not exist'
      );
    });
  });

  describe('when there are no tasks in the tasks folder', () => {
    it('logs an appropriate message', async () => {
      console.log = jest.fn();

      await createTasksFolder();

      const tasksScheduler = new TasksScheduler(tasksFolderPath);

      await tasksScheduler.run();

      expect((console.log as any).mock.calls[1][0]).toBe(`There are no tasks in the tasks folder: ${tasksFolderPath}. Stop tasks scheduler.`)
    });
  });
});
