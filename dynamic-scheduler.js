//-- GLOBAL --//
let schedule = {
    taskArr: [],
    startTime: 9 * 60 * 60,
    endTime: 21 * 60 * 60,
    get totalTime() {
        return this.endTime - this.startTime;
    }
}

let debug = false;
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
    let end = document.getElementById("finishMarker");
    let sched = document.getElementById("schedule");

    marker.style.width = sched.offsetWidth + 'px';
    start.style.width = sched.offsetWidth + 'px';
    stop.style.width = sched.offsetWidth + 'px';
    end.style.width = sched.offsetWidth + 'px';

    // Add menu
    let menu = document.getElementById("addMenu");
    menu.style.top = 40 + 'px';
}

//-- Utility --//
function getNow() {
    if (debug) {
        return fakeTime;
    }

    // Time in seconds since the start of the day
    let date = new Date();
    return (+date.getHours() * 3600) + (+date.getMinutes() * 60) + +date.getSeconds();
}

function secToPx(sec) {
    // Number of seconds to canvas pixel size
    let canvas = document.getElementById("timelineCanvas");
    return (canvas.offsetHeight / (24 * 60 * 60)) * sec;
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

function secToTimestamp(sec, res, form) {
    if (sec == 0) {
        if (res == 'min') {
            return "00:00";
        } else if (res == 'sec') {
            return "00:00:00";
        }
    }

    let hours = Math.floor(sec / 3600);
    if (hours < 10) hours = '0' + hours;
    // Minutes
    let minutes = Math.floor((sec - (hours * 3600)) / 60);
    if (minutes < 10) minutes = '0' + minutes;
    // Seconds
    let seconds = sec - (hours*3600) - (minutes*60);
    if (seconds < 10) seconds = '0' + seconds;

    // Time format
    let outSuffix = '';
    if (form == "ampm") {
        if (hours > 12) {
            hours = hours - 12;
            outSuffix = " PM";
        } else {
            outSuffix = " AM";
        }
    }

    // Resolution
    let outString;
    if (res == 'min') {
        outString = `${hours}:${minutes}`;
    } else if (res == 'sec') {
        outString = `${hours}:${minutes}:${seconds}`;
    }    

    return outString + outSuffix;
}

//-- Drawing --//
function markTimeline(time, length) {
    let canvas = document.getElementById("timelineCanvas");
    let ctx = canvas.getContext('2d');
    let lineY = secToPx(time * 60);
    ctx.beginPath();
    ctx.moveTo(0, lineY);
    ctx.lineTo(length, lineY);
    ctx.lineWidth = 1;
    ctx.stroke();
}

function markTimestamp(time, length) {
    let canvas = document.getElementById("timelineCanvas");
    let ctx = canvas.getContext('2d');
    let fontSize = 10;
    ctx.font = `${fontSize}px serif`
    ctx.fillText(secToTimestamp(time * 60, "min", "ampm"), length + 5, secToPx(time * 60) + (fontSize / 4));
}

function drawTimeline() {
    for (let i = 0; i < 24 * 60; i += 15) {    
        if(i == 0) continue;
        
        if(i % 60 == 0) {
            markTimeline(i, 20);
            markTimestamp(i, 20);
        } else if (i % 30 == 0) {
            markTimeline(i, 10);
        } else if (i % 15 == 0) {
            markTimeline(i, 5);
        }
    }
}

function getEditIndex() {
    for (let task of schedule.taskArr) {
        if (task.edit == true) return schedule.taskArr.indexOf(task);
    }
    return -1;
}

function swapTask(index, dir) {
    let base = Object.assign({}, schedule.taskArr[index]);
    let temp = Object.assign({}, schedule.taskArr[index + dir]);

    // Handle swapping of head task
    if (base.head) {
        base.head = false;
        temp.head = true;
    } else if (temp.head) {
        temp.head = false;
        base.head = true;
    }

    Object.assign(schedule.taskArr[index + dir], base);
    Object.assign(schedule.taskArr[index], temp);

    return index + dir;
}

// -- Update Functions --//
function updateMarkers() {
    let marker = document.getElementById("timeMarker");
    let tasklineTop = document.getElementById("timelineCanvas").getBoundingClientRect().top;
    marker.style.top = tasklineTop + window.scrollY + secToPx(getNow()) + 'px';

    // Draw schedule start and stop
    let start = document.getElementById("startMarker");
    start.style.top = tasklineTop + window.scrollY + secToPx(schedule.startTime) + 'px';
    let stop = document.getElementById("stopMarker");
    stop.style.top = tasklineTop + window.scrollY + secToPx(schedule.endTime) + 'px';

    // Draw projected finish of final task
    let finish = document.getElementById("finishMarker");
    if (schedule.taskArr.length == 0) {
        finish.style.visibility = 'hidden';
        return;
    }
   
    let finalTask = schedule.taskArr[schedule.taskArr.length - 1];
    if (finalTask.finished || finalTask.downtime) {
        finish.style.visibility = 'hidden';
    } else {
        finish.style.visibility = 'visible';
        finish.style.top = tasklineTop + window.scrollY + secToPx(finalTask.end) + 'px';
    }
    // Write timestamp of estimated finish
    finish.innerText = secToTimestamp(finalTask.end, 'min', 'ampm');

}

function updateTasks() {
    let first = true;
    let newDowntime = null;
    let downtimeIndex = 0;
    let now = getNow();

    for (let task of schedule.taskArr) {
        if (first && !task.downtime && !task.finished) {
            // In case of head task removal, assign new head
            task.head = true;
            first = false;
        }

        if(task.finished || task.downtime) {
            continue;
        } else if(task.active) {
            // Check if we have surpassed limit to transition to "finished" state
            if(task.activeStart + task.duration < now) {
                task.finished = true;
                task.elem.classList.remove("activeTask");
                task.elem.classList.add("finishedTask");
                let index = schedule.taskArr.indexOf(task);
                if (schedule.taskArr.length-1 > index) schedule.taskArr[index + 1].head = true;

                // Display Start and Stop times on finished tasks
                task.elem.innerText = `${task.name}\t${secToTimestamp(task.start, 'min', '24hour')}-${secToTimestamp(task.end, 'min', '24hour')}`;

                continue;
            }

            // Write a countdown till finish in active tasks
            task.elem.innerText = `${task.name} - ${secToTimestamp(task.end - now, 'sec', '24hour')}`;

            break;
            
        } else if(task.head) {
            task.start = now;
            task.elem.style.top = secToPx(task.start) + 'px';

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
                taskBlock.style.height = secToPx(downtimeDur) + "px";
                taskBlock.style.top = secToPx(downtimeStart) + 'px';

                let tasklineElem = document.getElementById("taskline");
                tasklineElem.append(taskBlock);
                let taskObj = new Task("Down Time", downtimeStart, downtimeDur, taskBlock);
                taskObj.downtime = true;
                newDowntime = taskObj;
                downtimeIndex = index;
            } else if (task.start > schedule.startTime && schedule.taskArr[index - 1].downtime) {
                // Elongate downtime block while task head remains inactive
                // Limited growth until schedule end limit, after which tasks aren't activateable anyway
                let downtimeEnd = Math.min(task.start, schedule.endTime);
                let downtimeDur = downtimeEnd - schedule.taskArr[index - 1].start;
                schedule.taskArr[index - 1].duration = downtimeDur;
                schedule.taskArr[index - 1].elem.style.height = secToPx(downtimeDur) + 'px';
                
            }
            
        } else {
            task.start = schedule.taskArr[schedule.taskArr.indexOf(task) - 1].end;
            task.elem.style.top = secToPx(task.start) + 'px';
        }
    }

    if (newDowntime) {
        // TODO: This should be async instead
        schedule.taskArr.splice(downtimeIndex, 0, newDowntime);
    }
}

function updateCount() {
    document.getElementById("downtimeCount").innerText = secToTimestamp(getDowntimeTotal(), 'sec', '24hour');
}

// Task object type
class Task {
    constructor(name, start, duration, elem) {
        // Variables
        this.name = name;
        this.start = start;
        this.duration = duration;
        this.elem = elem;

        // States
        this.head = false;
        this.active = false;
        this.activeStart = 0;
        this.finished = false;
        this.downtime = false;
        this.edit = false;
    }

    get end() {
        return this.start + this.duration;
    }

}

function createTask(name, start, dur) {
    let taskBlock = document.createElement('div');
    taskBlock.className = "taskBlock";
    taskBlock.innerText = name;
    taskBlock.style.position = 'absolute';
    taskBlock.style.height = secToPx(dur) + "px";

    // Task block vertical alignment
    taskBlock.style.top = secToPx(start) + 'px';

    // Append to the taskline element and ledger of current tasks
    let tasklineElem = document.getElementById("taskline");
    tasklineElem.append(taskBlock);
    return new Task(name, start, dur, taskBlock);    
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
        // Input as minutes, convert to seconds
        let taskDur = +form.elements.taskDur.value * 60;

        // Calculate task position details
        let taskStart;
        let taskHead;
        if (schedule.taskArr.length == 0 || schedule.taskArr[schedule.taskArr.length-1].finished) {
            taskStart = getNow(); 
            taskHead = true;
        } else {
            taskStart = schedule.taskArr[schedule.taskArr.length - 1].end;
            taskHead = false;
        }

        // Create new task, assign details
        let newTask = createTask(taskName, taskStart, taskDur);
        newTask.head = taskHead;
        newTask.elem.style.top = secToPx(taskStart) + 'px';

        // Append to the taskline element and ledger of current tasks
        let tasklineElem = document.getElementById("taskline");
        tasklineElem.append(newTask.elem);
        schedule.taskArr.push(newTask);

        // Prevent default (unwanted page reload)
        return false;
    }

    let addTaskCancel = document.getElementById("addTaskCancel");
    addTaskCancel.onclick = function() {
        document.getElementById("addMenu").style.visibility = 'hidden';
    }
}

function editKeyListener(e) {
    let index
    let dir;
    if (e.code == "ArrowUp") {
        dir = -1;
    } else if (e.code == "ArrowDown") {
    dir = 1;
    }
    index = swapTask(getEditIndex(), dir);
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
        
        // Create new popup div
        let popup = document.createElement('div');
        popup.className = "popup";
        popup.style.position = "absolute";

        // Activate/Deactivate buttons
        if(targetObj.head) {
            if(!targetObj.active) {
                let activate = document.createElement('input');
                activate.type = "button";
                activate.value = "Activate";
                popup.append(activate);

                activate.addEventListener('click', function() {
                    targetObj.active = true;
                    targetObj.activeStart = getNow();
                    targetObj.elem.classList.add("activeTask");
                    activate.remove();
                    popup.remove();
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

                    // Split unfinished time into a new task block
                    let index  = schedule.taskArr.indexOf(targetObj);
                    let now = getNow();
                    // New finished block
                    let finishDur = now - targetObj.start;
                    let finishBlock = createTask(targetObj.name, targetObj.start, finishDur);
                    finishBlock.finished = true;
                    finishBlock.elem.classList.add("finishedTask");
                    // New unfinished block
                    let unfinishDur = targetObj.end - now;
                    let unfinishBlock = createTask(targetObj.name, now, unfinishDur);
                    unfinishBlock.head = true;
                    // Splice into taskArr together
                    schedule.taskArr.splice(index, 1, finishBlock, unfinishBlock);
                    // Remove original div from taskline
                    targetObj.elem.remove();
                })
            }
        }

        // Remove button
        let remove = document.createElement('input');
        remove.type = "button";
        remove.value = "Remove";
        popup.append(remove);

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

        let editIndex = getEditIndex();
        if (!targetObj.active && editIndex == -1 || editIndex == targetIndex) {
            if (!targetObj.edit) {
                // Edit button
                let edit = document.createElement('input');
                edit.type = "button";
                edit.value = "Edit";
                popup.append(edit);

                edit.addEventListener('click', function() {
                    // TODO
                    // 1. Double click name to edit name
                    // 2. Duration edit via drag? (in "edit" mode)
                    // 3. Click and drag in "edit" mode
                    
                    targetObj.edit = true;
                    edit.remove();
                    popup.remove();
                    target.classList.add("editTask");
                    document.addEventListener('keydown', editKeyListener);           
                })
            } else {
                // Done button
                let done = document.createElement('input');
                done.type = "button";
                done.value = "Done";
                popup.append(done);

                done.addEventListener('click', function() {
                    targetObj.edit = false;
                    target.classList.remove("editTask");
                    done.remove();
                    popup.remove();
                    document.removeEventListener('keydown', editKeyListener);
                })
            }
        }

        // Cancel Button
        let cancel = document.createElement('input');
        cancel.type = "button";
        cancel.value = "Cancel";
        popup.append(cancel);

        cancel.addEventListener('click', function() {
            cancel.remove();
            popup.remove();
        })

        // Move the popup to click position and display
        let tlBox = tasklineElem.getBoundingClientRect();
        popup.style.top = e.clientY - tlBox.top + 'px';
        popup.style.left = e.clientX - tlBox.left + 'px';
        tasklineElem.append(popup);

        // TODO: Popup should be modal, requiring cancel button press (or 'esc' key press)
        // Or clicking away closes it

    });
}

function initDebugHandler() {
    document.addEventListener('keydown', function(e) {
        if (e.code = 'j') {
            fakeTime += (15 * 60);
        } else if (e.code = 'k') {
            fakeTime -= (15 * 60);
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
    updateMarkers();
    updateTasks();
    updateCount();
    setTimeout(updateEvents, "100");
}

//-- Program entry --//
setupCanvas();
drawTimeline();
initEventHandlers();

//-- Program Loop --//
updateEvents();

//-- Cleanup --//