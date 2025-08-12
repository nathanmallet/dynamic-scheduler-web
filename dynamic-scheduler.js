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

function markTimeline(time, length) {
    let canvas = document.getElementById("timelineCanvas");
    let lineY = (canvas.offsetHeight / schedule.totalTime) * time;
    let ctx = canvas.getContext('2d');
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

// Task object type
function Task(name, startTime, duration, elem) {
    this.name = name;
    this.startTime = startTime;
    this.duration = duration;
    this.elem = elem;

    // Append whenever we create (TODO: insert in chronological order)
    schedule.taskArr.append(this);
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
        let taskDur = form.elements.taskDur.value;

        // Create/Customise new taskBlock div
        let taskBlock = document.createElement('div');
        let canvas = document.getElementById("timelineCanvas");
        taskBlock.className = "taskBlock";
        taskBlock.innerText = taskName;
        taskBlock.style.height = (canvas.offsetHeight / schedule.totalTime) * taskDur + 'px';

        // TODO: Edit taskBlock y coord to match NOW or end of previous task

        // Append to the taskline element and ledger of current tasks
        let tasklineElem = document.getElementById("taskline");
        tasklineElem.append(taskBlock);

        // TODO: Call Task constructor (which should add us to the task ledger)


        // Prevent default
        return false;
    }

    // TODO: Init the cancel button handler (to reset input values and rehide the menu)
}

function initEventHandlers() {
    initAddMenuHandler();
    initAddFormHandler();
}

//-- Program entry --//
setupCanvas();
drawTimeline();
initEventHandlers();

// TODO: Merge menu bar into one table row


