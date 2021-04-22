export class BaseTask {
  /**
   * TaskName => task:name
   *
   */
  private getName() {
    console.log(this.constructor.name.replace(/([A-Z])/g, " $1"));

    return (
      // For example, we have here "TaskName"
      this.constructor.name
        // After this step we have " Task Name"
        .replace(/([A-Z])/g, " $1")
        // After this step we have ["", "Task", "Name"]
        .split(" ")
        // After this step we have ["Task", "Name"]
        .splice(1)
        // After this step we have "Task:Name"
        .join(":")
        // After this step we have "task:name"
        .toLowerCase()
    );
  }

  constructor() {
    this.name = this.getName();
  }

  public name: string;

  public schedule() {
    return null;
  }

  public run() {
    return null;
  }
}
