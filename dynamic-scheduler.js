let schedule = {
    taskArr: [],
    startTime: 0,
    endTime: 60 * 24,
    get totalTime() {
        return this.endTime - this.startTime;
    }
}

function setupCanvas() {
    let canvas = document.getElementById("timelineCanvas");
    canvas.height = canvas.offsetHeight;
    canvas.width = canvas.offsetWidth;
   
}

//-- Utility --//
function getNowMinutes() {
    // Time in minutes since the start of the day
    let date = new Date();
    return +date.getHours() * 60 + +date.getMinutes();
}

function minToPx(min) {
    // Number of minutes to canvas pixel size
    let canvas = document.getElementById("timelineCanvas");
    return (canvas.offsetHeight / schedule.totalTime) * min;
}

//-- Drawing --//
function markTimeline(time, length) {
    let canvas = document.getElementById("timelineCanvas");
    let ctx = canvas.getContext('2d');
    let lineY = minToPx(time);
    ctx.beginPath();
    ctx.moveTo(0, lineY);
    ctx.lineTo(length, lineY);
    ctx.lineWidth = 1;
    ctx.stroke();

    // TODO: At hour intervals, write the time as well
}

function drawTimeline() {
    for (let i = schedule.startTime; i < schedule.endTime; i += 15) {    
        if(i == 0) continue;
        
        if(i % 60 == 0) {
            markTimeline(i, 20);
        } else if (i % 30 == 0) {
            markTimeline(i, 10);
        } else if (i % 15 == 0) {
            markTimeline(i, 5);
        }
    }
}

// TODO: Timeline should draw all 24 hours (later reduced/increased by zoom/scroll handler), schedule start/end should set a marker to indicate day start/end instead

// TODO: Draw the dynamic current time line
function drawCurrentTime() {
    // TODO: NEED NEW CANVAS FOR TASKLINE
    let canvas = document.getElementById("timelineCanvas");
    let ctx = canvas.getContext('2d');
}

// Task object type
class Task {
    constructor(name, start, duration, elem) {
        this.name = name;
        this.start = start;
        this.duration = duration;
        this.elem = elem;
        this.active = false;
        this.finished = false;
    }

    get end() {
        return this.start + this.duration;
    }

}

//-- Event Handlers --//
function initAddMenuHandler() {
    let addElem = document.getElementById("addButton");
    addElem.onclick = function() {
        document.getElementById("addMenu").style.visibility = 'visible';
    }
}

function initAddFormHandler() {
    let form = document.forms.addForm
    form.onsubmit = function() {
        let taskName = form.elements.taskName.value;
        let taskDur = +form.elements.taskDur.value;

        // Create/Customise new taskBlock div
        let taskBlock = document.createElement('div');
        taskBlock.className = "taskBlock";
        taskBlock.innerText = taskName;
        taskBlock.style.position = 'absolute';
        taskBlock.style.height = minToPx(taskDur) + "px";

        // Task block vertical alignment
        let taskStart;
        if (schedule.taskArr.length == 0) {
            taskStart = getNowMinutes();
        } else {
            taskStart = schedule.taskArr[schedule.taskArr.length - 1].end;
        }
        taskBlock.style.top = minToPx(taskStart) + 'px';

        // Append to the taskline element and ledger of current tasks
        let tasklineElem = document.getElementById("taskline");
        tasklineElem.append(taskBlock);

        // Call Task constructor
        let taskObj = new Task(taskName, taskStart, taskDur, taskBlock);
        schedule.taskArr.push(taskObj);
        
        // Prevent default (unwanted page reload)
        return false;
    }

    let addTaskCancel = document.getElementById("addTaskCancel");
    addTaskCancel.onclick = function() {
        document.getElementById("addMenu").style.visibility = 'hidden';
    }
}

function initEventHandlers() {
    initAddMenuHandler();
    initAddFormHandler();
}

//-- Program entry --//
setupCanvas();
drawTimeline();
initEventHandlers();


