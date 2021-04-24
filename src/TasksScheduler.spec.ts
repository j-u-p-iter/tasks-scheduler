import path from 'path';
import { ensureDir, outputFile, remove } from 'fs-extra';
import { InvalidPathError } from "@j.u.p.iter/custom-error";
import { TasksScheduler } from '.';
import { v4 as uuid } from 'uuid';
import cron from 'node-cron';

const ValidTask = `
  import { BaseTask } from '../../../dist/lib';

  export default class ValidTask extends BaseTask {
    schedule() {
      return '* * * * *';
    }; 

    run() {
      console.log("Schedule task");  
    };
  }
`;

const TaskWithoutSchedule = `
  import { BaseTask } from '../../../dist/lib';

  export default class TaskWithoutSchedule extends BaseTask {
    run() {
      console.log("running task");  
    };
  }
`;

const TaskWithInvalidScheduleExpression = `
  import { BaseTask } from '../../../dist/lib';

  export default class TaskWithInvalidScheduleExpression extends BaseTask {
    schedule() {
      return '*';
    }; 

    run() {
      console.log("running task");  
    };
  }
`;

const TaskWithoutRun = `
  import { BaseTask } from '../../../dist/lib';

  export default class TaskWithoutRun extends BaseTask {
    schedule() {
      return '* * * * *';
    }; 
  }
`;

const TASK_1_NAME = 'Task.ts';
//const TASK_2_NAME = 'Task.txt';

const TASKS_FOLDER_NAME = 'tasks';

const rootTasksFolderPath = path.join(__dirname, TASKS_FOLDER_NAME); 

const createTasksFolderPath = () => path.join(rootTasksFolderPath, uuid());

const createTasksFolder = async (tasks = []) => {
  const tasksFolderPath = createTasksFolderPath();

  await ensureDir(tasksFolderPath);

  if (!tasks.length) { return tasksFolderPath; }

  await Promise.all(tasks.map(({ name, content = '' }) => {
    return outputFile(
      path.join(tasksFolderPath, name),
      content
    );
  }));

  return tasksFolderPath;
}

const scheduleSpy = jest.spyOn(cron, 'schedule').mockImplementation(() => {});

describe('TasksScheduler', () => {
  afterEach(async () => {
    await remove(path.join(rootTasksFolderPath));

    scheduleSpy.mockClear();
  });

  it('logs running indication message in the beginning', async () => {
    console.log = jest.fn();

    const tasksFolderPath = await createTasksFolder();

    const tasksScheduler = new TasksScheduler(tasksFolderPath);

    tasksScheduler.run();

    expect(console.log).toHaveBeenCalledWith('Start running tasks...');
  });

  describe('when there is no tasks folder by the provided path', () => {
    it('throws an appropriate error properly', async () => {
      const tasksScheduler = new TasksScheduler('./someInvalidPath');

      const runTasksResult = tasksScheduler.run();

      await expect(runTasksResult).rejects.toThrow(InvalidPathError);
      await expect(runTasksResult).rejects.toThrow(`Directory ${path.resolve(__dirname, '..')}/someInvalidPath does not exist`);
    });
  });

  describe('when there are no tasks in the tasks folder', () => {
    it('logs an appropriate message', async () => {
      console.log = jest.fn();

      const tasksFolderPath = await createTasksFolder();

      const tasksScheduler = new TasksScheduler(tasksFolderPath);

      await tasksScheduler.run();

      expect((console.log as any).mock.calls[1][0]).toBe(`There are no tasks in the tasks folder: ${tasksFolderPath}. Stop tasks scheduler.`)
    });
  });

  describe('when there is an empty task in the tasks folder', () => {
    it('throws an appropriate error', async () => {
      const tasksFolderPath = await createTasksFolder([{ name: TASK_1_NAME }]);

      const tasksScheduler = new TasksScheduler(tasksFolderPath);

      const runTasksResult = tasksScheduler.run();

      await expect(runTasksResult).rejects.toThrow(Error);
      await expect(runTasksResult).rejects.toThrow(
        `Task in "${TASK_1_NAME}" task file was not declared.`
      );
    });
  });

  describe('when there is a task without schedule method', () => {
    it('throws an appropriate error', async () => {
      const tasksFolderPath = await createTasksFolder([{ name: TASK_1_NAME, content: TaskWithoutSchedule }]);

      const tasksScheduler = new TasksScheduler(tasksFolderPath);

      const runTasksResult = tasksScheduler.run();

      await expect(runTasksResult).rejects.toThrow(Error);
      await expect(runTasksResult).rejects.toThrow(
        'The task "task:without:schedule" should declare schedule'
      );
    });
  });

  describe('when schedule expression is not valid', () => {
    it('throws an appropriate error', async () => {
      const tasksFolderPath = await createTasksFolder([{ name: TASK_1_NAME, content: TaskWithInvalidScheduleExpression }]);

      const tasksScheduler = new TasksScheduler(tasksFolderPath);

      const runTasksResult = tasksScheduler.run();

      await expect(runTasksResult).rejects.toThrow(Error);
      await expect(runTasksResult).rejects.toThrow(
        'The task "task:with:invalid:schedule:expression" declares invalid schedule *'
      );
    });
  });

  describe('when there is a task without run method', () => {
    it('throws an appropriate error', async () => {
      const tasksFolderPath = await createTasksFolder([{ name: TASK_1_NAME, content: TaskWithoutRun }]);

      const tasksScheduler = new TasksScheduler(tasksFolderPath);

      const runTasksResult = tasksScheduler.run();

      await expect(runTasksResult).rejects.toThrow(Error);
      await expect(runTasksResult).rejects.toThrow(
        'The task "task:without:run" should declare run method'
      );
    });
  });

  describe('when there is a valid task', () => {
    it('runs a task', async () => {
      const tasksFolderPath = await createTasksFolder([{ name: TASK_1_NAME, content: ValidTask }]);

      const tasksScheduler = new TasksScheduler(tasksFolderPath);

      await tasksScheduler.run();

      expect(scheduleSpy.mock.calls[0][0]).toBe('* * * * *');
      expect(typeof scheduleSpy.mock.calls[0][1]).toBe('function');
    });
  });

  describe('when run multiple times', () => {

  });
});
