//-- GLOBAL --//
let schedule = {
    taskArr: [],
    startTime: 0,
    endTime: 60 * 24,
    get totalTime() {
        return this.endTime - this.startTime;
    }
}

function setupCanvas() {
    // Timeline canvas
    let canvas = document.getElementById("timelineCanvas");
    canvas.height = canvas.offsetHeight;
    canvas.width = canvas.offsetWidth;

    // Time marker
    let marker = document.getElementById("timeMarker");
    let sched = document.getElementById("schedule");
    marker.style.width = sched.offsetWidth + 'px';

    // Add menu
    let menu = document.getElementById("addMenu");
    menu.style.top = 40 + 'px';
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

function getTaskObjFromElem(elem) {
    for (let task of schedule.taskArr) {
        if (task.elem == elem) return task;
    }
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

// TODO: Time marker and task start are currently offset for some reason
function drawCurrentTime() {
    let marker = document.getElementById("timeMarker");
    let tasklineTop = document.getElementById("timelineCanvas").getBoundingClientRect().top;
    marker.style.top = tasklineTop + window.scrollY + minToPx(getNowMinutes()) + 'px';
}

function updateTasks() {
    let first = true;
    for (let task of schedule.taskArr) {
        if (first) {
            // In case of head task removal, assign new head
            task.head = true;
            first = false;
        }

        if(task.finished) {
            continue;
        } else if(task.active) {
            break;
        } else if(task.head) {
            task.start = getNowMinutes();
            task.elem.style.top = minToPx(task.start) + 'px';
        } else {
            task.start = schedule.taskArr[schedule.taskArr.indexOf(task) - 1].end;
            task.elem.style.top = minToPx(task.start) + 'px';
        }
    }
}

// Task object type
class Task {
    constructor(name, start, duration, head, elem) {
        this.name = name;
        this.start = start;
        this.duration = duration;
        this.elem = elem;
        this.head = head;

        this.active = false;
        this.activeStart = false;
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
        let taskHead;
        if (schedule.taskArr.length == 0) {
            taskStart = getNowMinutes(); 
            taskHead = true;
        } else {
            taskStart = schedule.taskArr[schedule.taskArr.length - 1].end;
            taskHead = false;
        }
        taskBlock.style.top = minToPx(taskStart) + 'px';

        // Append to the taskline element and ledger of current tasks
        let tasklineElem = document.getElementById("taskline");
        tasklineElem.append(taskBlock);
        let taskObj = new Task(taskName, taskStart, taskDur, taskHead, taskBlock);
        schedule.taskArr.push(taskObj);

        // Prevent default (unwanted page reload)
        return false;
    }

    let addTaskCancel = document.getElementById("addTaskCancel");
    addTaskCancel.onclick = function() {
        document.getElementById("addMenu").style.visibility = 'hidden';
    }
}

function initPopupHandler() {
    let tasklineElem = document.getElementById("taskline");
    tasklineElem.addEventListener('click', function(e) {
        // NOTE: Be careful if you add more types of divs to the taskline area, we'll trigger this event
        let target = e.target.closest('div');
        if (!target) return;
        
        // 1. Create new popup div with edit/remove buttons
        let popup = document.createElement('div');
        popup.className = "popup";
        popup.style.position = "absolute";
        let remove = document.createElement('input');
        remove.type = "button";
        remove.value = "Remove";
        popup.append(remove);
        tasklineElem.append(popup);

        // 2. Move the relevant popup to click position
        let tlBox = tasklineElem.getBoundingClientRect();
        popup.style.top = e.clientY - tlBox.top + 'px';
        popup.style.left = e.clientX - tlBox.left + 'px';

        // 3. Instatiate new div's button handlers with reference to target (to act on for edit/remove)
        // Remove button handler
        remove.addEventListener('click', function() {
            let index = schedule.taskArr.indexOf(getTaskObjFromElem(target));
            target.remove();
            remove.remove();
            for (let task of schedule.taskArr) {
                if (target == task.elem) {
                    schedule.taskArr.splice(index, 1);
                }
            }
            // TODO: We should be able to update just a portion after the removal here for effeciency
            updateTasks();
        });

        // TODO: Edit and close popup button (modal) button handlers

    });
}

function initEventHandlers() {
    initAddMenuHandler();
    initAddFormHandler();
    initPopupHandler();
}

function updateEvents() {
    drawCurrentTime();
    updateTasks();
    setTimeout(updateEvents, "1000");
}

//-- Program entry --//
setupCanvas();
drawTimeline();
initEventHandlers();

//-- Program Loop --//
updateEvents();

//-- Cleanup --//