//-- GLOBAL --//
let schedule = {
    taskArr: [],
    startTime: 9 * 60,
    endTime: 21 * 60,
    get totalTime() {
        return this.endTime - this.startTime;
    }
}

let debug = true;
let fakeTime = schedule.startTime;

function setupCanvas() {
    // Timeline canvas
    let canvas = document.getElementById("timelineCanvas");
    canvas.height = canvas.offsetHeight;
    canvas.width = canvas.offsetWidth;

    // Time markers
    let marker = document.getElementById("timeMarker");
    let start = document.getElementById("startMarker");
    let stop = document.getElementById("stopMarker");
    let sched = document.getElementById("schedule");

    marker.style.width = sched.offsetWidth + 'px';
    start.style.width = sched.offsetWidth + 'px';
    stop.style.width = sched.offsetWidth + 'px';

    // Add menu
    let menu = document.getElementById("addMenu");
    menu.style.top = 40 + 'px';
}

//-- Utility --//
function getNowMinutes() {
    if (debug) {
        return fakeTime;
    }

    // Time in minutes since the start of the day
    let date = new Date();
    return +date.getHours() * 60 + +date.getMinutes();
}

function minToPx(min) {
    // Number of minutes to canvas pixel size
    let canvas = document.getElementById("timelineCanvas");
    return (canvas.offsetHeight / (24 * 60)) * min;
}

function getTaskObjFromElem(elem) {
    for (let task of schedule.taskArr) {
        if (task.elem == elem) return task;
    }
}

function getDowntimeTotal() {
    let total = 0;
    for (let task of schedule.taskArr) {
        if (task.downtime) total += task.duration;
    }
    return total;
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
    for (let i = 0; i < 24 * 60; i += 15) {    
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

// -- Update Functions --//
function drawCurrentTime() {
    let marker = document.getElementById("timeMarker");
    let tasklineTop = document.getElementById("timelineCanvas").getBoundingClientRect().top;
    marker.style.top = tasklineTop + window.scrollY + minToPx(getNowMinutes()) + 'px';

    // Draw schedule start and stop
    let start = document.getElementById("startMarker");
    start.style.top = tasklineTop + window.scrollY + minToPx(schedule.startTime) + 'px';
    let stop = document.getElementById("stopMarker");
    stop.style.top = tasklineTop + window.scrollY + minToPx(schedule.endTime) + 'px';
}

function updateTasks() {
    let first = true;
    let newDowntime = null;
    let downtimeIndex = 0;
    for (let task of schedule.taskArr) {
        if (first && !task.downtime) {
            // In case of head task removal, assign new head
            task.head = true;
            first = false;
        }

        if(task.finished) {
            continue;
        } else if(task.active) {
            // Check if we have surpassed limit to transition to "finished" state
            if(task.activeStart + task.duration < getNowMinutes()) {
                task.finished = true;
                task.elem.classList.remove("activeTask");
                task.elem.classList.add("finishedTask");
                let index = schedule.taskArr.indexOf(task);
                if (schedule.taskArr.length-1 > index) schedule.taskArr[index + 1].head = true;
                continue;
            }
            break;
            
        } else if(task.head) {
            task.start = getNowMinutes();
            task.elem.style.top = minToPx(task.start) + 'px';

            let index = schedule.taskArr.indexOf(task);
            // If preceding downtime block doesn't yet exist and we are passed the schedule start time
            if (task.start > schedule.startTime && (index == 0 || schedule.taskArr[index - 1].downtime == false)) {
                // New downtime task block
                let taskBlock = document.createElement('div');
                taskBlock.className = "taskBlock";
                taskBlock.classList.add("downtimeTask");
                taskBlock.style.position = 'absolute';

                // TODO: Inner text should only appear when block is large enough to contain it
                // taskBlock.innerText = "Down Time";

                let downtimeDur;
                let downtimeStart;
                if (index == 0) {
                    // Downtime for tasks with no previous tasks, is from schedule start time
                    downtimeStart = schedule.startTime;
                } else {
                    // Regular downtime measurement, between current task start and previous finished task
                    downtimeStart = schedule.taskArr[index - 1].end;
                }
                downtimeDur = task.start - downtimeStart;
                taskBlock.style.height = minToPx(downtimeDur) + "px";
                taskBlock.style.top = minToPx(downtimeStart) + 'px';

                let tasklineElem = document.getElementById("taskline");
                tasklineElem.append(taskBlock);
                let taskObj = new Task("Down Time", downtimeStart, downtimeDur, false, taskBlock);
                taskObj.downtime = true;
                newDowntime = taskObj;
                downtimeIndex = index;
            } else if (task.start > schedule.startTime && schedule.taskArr[index - 1].downtime) {
                // Elongate downtime block while task head remains inactive
                // Limited growth until schedule end limit, after which tasks aren't activateable anyway
                let downtimeEnd = Math.min(task.start, schedule.endTime);
                let downtimeDur = downtimeEnd - schedule.taskArr[index - 1].start;
                schedule.taskArr[index - 1].duration = downtimeDur;
                schedule.taskArr[index - 1].elem.style.height = minToPx(downtimeDur) + 'px';
                
            }
            
        } else if(!task.downtime) {
            task.start = schedule.taskArr[schedule.taskArr.indexOf(task) - 1].end;
            task.elem.style.top = minToPx(task.start) + 'px';
        }
    }

    if (newDowntime) {
        // TODO: This should be async instead
        schedule.taskArr.splice(downtimeIndex, 0, newDowntime);
    }
}

function updateCount() {
    let countElem = document.getElementById("downtimeCount");
    let downtime  = getDowntimeTotal();
    if (!downtime) {
        countElem.innerText = '00:00';
        return;
    }
    // Format to datetime style
    // Hours
    let hours = Math.floor(downtime / 60);
    if (hours < 10) hours = '0' + hours;
    // Minutes
    let minutes = downtime - (hours*60);
    if (minutes < 10) minutes = '0' + minutes;

    countElem.innerText = `${hours}:${minutes}`;
}

// Task object type
class Task {
    constructor(name, start, duration, head, elem) {
        // Variables
        this.name = name;
        this.start = start;
        this.duration = duration;
        this.elem = elem;
        this.head = head;

        // States
        this.active = false;
        this.activeStart = 0;
        this.finished = false;
        this.downtime = false;
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
        // taskBlock.innerText = taskName;
        taskBlock.style.position = 'absolute';
        taskBlock.style.height = minToPx(taskDur) + "px";

        // Task block vertical alignment
        let taskStart;
        let taskHead;
        if (schedule.taskArr.length == 0 || schedule.taskArr[schedule.taskArr.length-1].finished) {
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
        let targetIndex = schedule.taskArr.indexOf(getTaskObjFromElem(target));
        let targetObj = schedule.taskArr[targetIndex];

        // Finished/Downtime tasks require no further actions
        if (targetObj.finished || targetObj.downtime) return;
        
        // 1. Create new popup div with necessary buttons
        let popup = document.createElement('div');
        popup.className = "popup";
        popup.style.position = "absolute";

        // Remove button
        let remove = document.createElement('input');
        remove.type = "button";
        remove.value = "Remove";
        popup.append(remove);

        // Edit button
        let edit = document.createElement('input');
        edit.type = "button";
        edit.value = "Edit";
        popup.append(edit);

        // Activate/Deactivate buttons
        if(targetObj.head) {
            if(!targetObj.active) {
                let activate = document.createElement('input');
                activate.type = "button";
                activate.value = "Activate";
                popup.append(activate);

                activate.addEventListener('click', function() {
                    targetObj.active = true;
                    targetObj.activeStart = getNowMinutes();
                    targetObj.elem.classList.add("activeTask");
                    activate.remove();
                    popup.remove();

                    // TODO: Count between activation time and previous finish time for downtime 
                    // Add to a visible down time counter? Add in real time as head task remains inactive?
                })
            }
            else {
                let deactivate = document.createElement('input');
                deactivate.type = "button";
                deactivate.value = "Deactivate";
                popup.append(deactivate);

                deactivate.addEventListener('click', function() {
                    targetObj.active = false;
                    targetObj.elem.classList.remove("activeTask");
                    deactivate.remove();
                    popup.remove();

                    // TODO: On split divide task time into two new blocks
                    // 1. Time used since activation becomes a new finished block
                    // 2. Remaining time in task duration becomes a new incomplete head task
                })
            }
        }

        // Cancel Button
        let cancel = document.createElement('input');
        cancel.type = "button";
        cancel.value = "Cancel";
        popup.append(cancel);

        tasklineElem.append(popup);

        // 2. Move the relevant popup to click position
        let tlBox = tasklineElem.getBoundingClientRect();
        popup.style.top = e.clientY - tlBox.top + 'px';
        popup.style.left = e.clientX - tlBox.left + 'px';

        // 3. Instatiate new div's button handlers with reference to target (to act on for edit/remove)
        // Remove button handler
        remove.addEventListener('click', function() {
            target.remove();
            remove.remove();
            popup.remove();
            for (let task of schedule.taskArr) {
                if (target == task.elem) {
                    schedule.taskArr.splice(targetIndex, 1);
                }
            }
            // TODO: We should be able to update just a portion after the removal here for effeciency
            updateTasks();
        });

        edit.addEventListener('click', function() {
            // TODO: Require another popup menu (name, duration, index)
        })

        cancel.addEventListener('click', function() {
            cancel.remove();
            popup.remove();
        })

        // TODO: Popup should be modal, requiring cancel button press (or 'esc' key press)

    });
}

function initDebugHandler() {
    document.addEventListener('keydown', function(e) {
        if (e.code = 'ArrowDown') {
            fakeTime += 15;
        } else if (e.code = 'ArrowUp') {
            fakeTime -= 15;
        }
    })
}

function initEventHandlers() {
    initAddMenuHandler();
    initAddFormHandler();
    initPopupHandler();
    initDebugHandler();
}

function updateEvents() {
    drawCurrentTime();
    updateTasks();
    updateCount();
    setTimeout(updateEvents, "1000");
}

//-- Program entry --//
setupCanvas();
drawTimeline();
initEventHandlers();

//-- Program Loop --//
updateEvents();

//-- Cleanup --//