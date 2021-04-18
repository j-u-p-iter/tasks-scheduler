import path from 'path';
import { ensureDir, outputFile, remove } from 'fs-extra';
import { InvalidPathError } from "@j.u.p.iter/custom-error";
import { TasksScheduler } from './TasksScheduler';
import { v4 as uuid } from 'uuid';

//const Task = `
  //import { BaseTask } from '../../dist/lib';

  //export default class Task1 extends BaseTask {
    //name = 'Task1';

    //schedule() {
      //return '******';
    //}; 

    //run() {
      //console.log("running task");  
    //};
  //}
//`;

const TaskWithoutSchedule = `
  import { BaseTask } from '../../../dist/lib';

  export default class Task1 extends BaseTask {
    name = 'Task1';

    run() {
      console.log("running task");  
    };
  }
`;

const TaskWithInvalidScheduleExpression = `
  import { BaseTask } from '../../../dist/lib';

  export default class Task1 extends BaseTask {
    name = 'Task1';

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

  export default class Task1 extends BaseTask {
    name = 'TaskWithoutRun';

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

describe('TasksScheduler', () => {
  afterEach(async () => {
    await remove(path.join(rootTasksFolderPath));
  });

  it('logs running indication message in the beginning', async () => {
    console.log = jest.fn();

    const tasksFolderPath = await createTasksFolder();

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

      expect(runTasksResult).rejects.toThrow(Error);
      expect(runTasksResult).rejects.toThrow(
        `Task in "${TASK_1_NAME}" task file was not declared.`
      );
    });
  });

  describe('when there is a task without schedule method', () => {
    it('throws an appropriate error', async () => {
      const tasksFolderPath = await createTasksFolder([{ name: TASK_1_NAME, content: TaskWithoutSchedule }]);

      const tasksScheduler = new TasksScheduler(tasksFolderPath);

      const runTasksResult = tasksScheduler.run();

      expect(runTasksResult).rejects.toThrow(Error);
      expect(runTasksResult).rejects.toThrow(
        'The task "Task1" should declare schedule'
      );
    });
  });

  describe('when schedule expression is not valid', () => {
    it('throws an appropriate error', async () => {
      const tasksFolderPath = await createTasksFolder([{ name: TASK_1_NAME, content: TaskWithInvalidScheduleExpression }]);

      const tasksScheduler = new TasksScheduler(tasksFolderPath);

      const runTasksResult = tasksScheduler.run();

      expect(runTasksResult).rejects.toThrow(Error);
      expect(runTasksResult).rejects.toThrow(
        'The task "Task1" declares invalid schedule *'
      );
    });
  });

  describe('when there is a task without run method', () => {
    it('throws an appropriate error', async () => {
      const tasksFolderPath = await createTasksFolder([{ name: TASK_1_NAME, content: TaskWithoutRun }]);

      const tasksScheduler = new TasksScheduler(tasksFolderPath);

      const runTasksResult = tasksScheduler.run();

      expect(runTasksResult).rejects.toThrow(Error);
      expect(runTasksResult).rejects.toThrow(
        'The task "TaskWithoutRun" should declare run method'
      );
    });
  });
});
