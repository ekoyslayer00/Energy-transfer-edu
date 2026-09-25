// js/quiz-engine.js
import { supabase } from './supabase.js';

let questions = [];
let currentIndex = 0;
let score = 0;
let currentAnswer = null;
let quizId = 'YOUR_QUIZ_UUID'; // Update this later to grab dynamically from URL or selection

const gameArea = document.getElementById('game-area');
const submitBtn = document.getElementById('submit-btn');
const nextBtn = document.getElementById('next-btn');

// --- INITIALIZATION ---

async function loadQuiz() {
    // Fetch 10 questions for this quiz
    const { data, error } = await supabase
        .from('questions')
        .select('*')
        .eq('quiz_id', quizId)
        .limit(10);

    if (error) {
        gameArea.innerHTML = `<p>Error loading quiz: ${error.message}</p>`;
        return;
    }

    if (!data || data.length === 0) {
        gameArea.innerHTML = `<p>No questions found for this quiz yet.</p>`;
        return;
    }

    questions = data;
    renderQuestion();
}

function renderQuestion() {
    const q = questions[currentIndex];
    document.getElementById('current-q-num').innerText = currentIndex + 1;
    
    submitBtn.style.display = 'block';
    nextBtn.style.display = 'none';
    currentAnswer = null; // Reset answer for the new question

    // Route to the correct game type renderer
    if (q.type === 'poll') renderPoll(q);
    else if (q.type === 'drag_drop') renderDragDrop(q);
    else if (q.type === 'connect_the_dot') renderConnectDot(q);
}

// --- 1. POLL ENGINE ---

function renderPoll(q) {
    let html = `<h3>${q.content.question}</h3><div class="options-grid">`;
    
    q.content.options.forEach((opt, index) => {
        html += `<button class="option-btn" onclick="selectPollOption(${index}, this)">${opt}</button>`;
    });
    html += `</div>`;
    gameArea.innerHTML = html;
}

window.selectPollOption = (index, btnElement) => {
    document.querySelectorAll('.option-btn').forEach(b => b.classList.remove('selected'));
    btnElement.classList.add('selected');
    currentAnswer = index;
};

// --- 2. CONNECT THE DOTS ENGINE ---

function renderConnectDot(q) {
    const data = q.content;
    let studentConnections = []; 
    currentAnswer = studentConnections; 

    let html = `<h3>${data.instruction || 'Connect the matching dots.'}</h3>
                <div style="text-align: center;">
                    <canvas id="connect-canvas" width="400" height="300" style="border: 1px solid #ccc; background: #fff; cursor: crosshair; border-radius: 8px; max-width: 100%;"></canvas>
                </div>
                <button id="clear-canvas-btn" style="margin-top: 1rem; background: #6B7280;">Clear Lines</button>`;
    
    gameArea.innerHTML = html;

    const canvas = document.getElementById('connect-canvas');
    const ctx = canvas.getContext('2d');
    const dots = data.dots;
    const dotRadius = 8;

    let isDrawing = false;
    let startDot = null;
    let currentMousePos = { x: 0, y: 0 };

    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw confirmed connections
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#4F46E5';
        studentConnections.forEach(pair => {
            const d1 = dots.find(d => d.id === pair[0]);
            const d2 = dots.find(d => d.id === pair[1]);
            if (d1 && d2) {
                ctx.beginPath();
                ctx.moveTo(d1.x, d1.y);
                ctx.lineTo(d2.x, d2.y);
                ctx.stroke();
            }
        });

        // Draw active dragging line
        if (isDrawing && startDot) {
            ctx.beginPath();
            ctx.strokeStyle = '#9CA3AF'; 
            ctx.moveTo(startDot.x, startDot.y);
            ctx.lineTo(currentMousePos.x, currentMousePos.y);
            ctx.stroke();
        }

        // Draw dots and labels
        dots.forEach(dot => {
            ctx.beginPath();
            ctx.arc(dot.x, dot.y, dotRadius, 0, Math.PI * 2);
            ctx.fillStyle = '#10B981';
            ctx.fill();
            ctx.strokeStyle = '#059669';
            ctx.lineWidth = 2;
            ctx.stroke();

            ctx.fillStyle = '#1F2937';
            ctx.font = '14px Segoe UI';
            ctx.textAlign = dot.x < 200 ? 'left' : 'right';
            const xOffset = dot.x < 200 ? 15 : -15;
            ctx.fillText(dot.label, dot.x + xOffset, dot.y + 5);
        });
    }

    function getDotAtMouse(x, y) {
        return dots.find(dot => Math.hypot(dot.x - x, dot.y - y) < dotRadius + 10);
    }

    canvas.addEventListener('mousedown', (e) => {
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const clickedDot = getDotAtMouse(mouseX, mouseY);
        if (clickedDot) {
            isDrawing = true;
            startDot = clickedDot;
            currentMousePos = { x: mouseX, y: mouseY };
        }
    });

    canvas.addEventListener('mousemove', (e) => {
        if (!isDrawing) return;
        const rect = canvas.getBoundingClientRect();
        currentMousePos = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
        draw();
    });

    canvas.addEventListener('mouseup', (e) => {
        if (!isDrawing) return;
        
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        const endDot = getDotAtMouse(mouseX, mouseY);

        if (endDot && endDot.id !== startDot.id) {
            const exists = studentConnections.some(pair => 
                (pair[0] === startDot.id && pair[1] === endDot.id) || 
                (pair[1] === startDot.id && pair[0] === endDot.id)
            );

            studentConnections = studentConnections.filter(pair => 
                pair[0] !== startDot.id && pair[1] !== startDot.id &&
                pair[0] !== endDot.id && pair[1] !== endDot.id
            );

            if (!exists) {
                studentConnections.push([startDot.id, endDot.id]);
                currentAnswer = studentConnections;
            }
        }

        isDrawing = false;
        startDot = null;
        draw();
    });

    document.getElementById('clear-canvas-btn').addEventListener('click', () => {
        studentConnections = [];
        currentAnswer = studentConnections;
        draw();
    });

    draw();
}

// --- 3. DRAG AND DROP ENGINE ---

function renderDragDrop(q) {
    const data = q.content;
    currentAnswer = {}; // This will store matches like { "Sun": "Radiation" }

    let html = `<h3>${data.instruction || 'Drag the items into the correct zones.'}</h3>`;
    html += `<div style="display: flex; gap: 2rem; margin-top: 1rem;">`;

    // Create Draggable Items
    html += `<div id="drag-items" style="flex: 1; display: flex; flex-direction: column; gap: 0.5rem;">
        <h4 style="margin-bottom: 0.5rem;">Items</h4>
        ${data.items.map(item => `
            <div class="draggable-item" draggable="true" data-item="${item}"
                 style="padding: 0.75rem; background: #E5E7EB; border: 1px solid #D1D5DB; cursor: grab; border-radius: 4px; text-align: center; font-weight: 500;">
                ${item}
            </div>
        `).join('')}
    </div>`;

    // Create Drop Zones
    html += `<div id="drop-zones" style="flex: 1; display: flex; flex-direction: column; gap: 1rem;">
        <h4 style="margin-bottom: 0.5rem;">Drop Zones</h4>
        ${data.zones.map(zone => `
            <div class="drop-zone" data-zone="${zone}"
                 style="padding: 1rem; border: 2px dashed #9CA3AF; border-radius: 4px; min-height: 80px; background: #F9FAFB; transition: border-color 0.2s;">
                <strong style="display: block; margin-bottom: 0.5rem; color: #4B5563;">${zone}</strong>
                <div class="dropped-items" style="display: flex; flex-direction: column; gap: 0.5rem;"></div>
            </div>
        `).join('')}
    </div>`;

    html += `</div>`;
    gameArea.innerHTML = html;

    const draggables = document.querySelectorAll('.draggable-item');
    const dropZones = document.querySelectorAll('.drop-zone');

    draggables.forEach(item => {
        item.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', item.dataset.item);
            setTimeout(() => item.style.opacity = '0.4', 0);
        });
        item.addEventListener('dragend', () => {
            item.style.opacity = '1';
        });
    });

    dropZones.forEach(zone => {
        zone.addEventListener('dragover', (e) => {
            e.preventDefault();
            zone.style.borderColor = '#4F46E5';
        });
        zone.addEventListener('dragleave', () => {
            zone.style.borderColor = '#9CA3AF';
        });
        zone.addEventListener('drop', (e) => {
            e.preventDefault();
            zone.style.borderColor = '#9CA3AF';
            const itemName = e.dataTransfer.getData('text/plain');
            
            const draggedElement = document.querySelector(`.draggable-item[data-item="${itemName}"]`);
            if (draggedElement) {
                zone.querySelector('.dropped-items').appendChild(draggedElement);
                currentAnswer[itemName] = zone.dataset.zone;
            }
        });
    });
}

// --- SUBMISSION & SCORING ---

submitBtn.addEventListener('click', () => {
    if (currentAnswer === null || (typeof currentAnswer === 'object' && Object.keys(currentAnswer).length === 0)) {
        return alert("Please select or complete your answer!");
    }
    
    const q = questions[currentIndex];
    const isCorrect = checkAnswer(q.type, currentAnswer, q.correct_answer);
    
    if (isCorrect) score++;
    
    submitBtn.style.display = 'none';
    nextBtn.style.display = 'block';
    
    gameArea.innerHTML += `<h3 style="color: ${isCorrect ? '#10B981' : '#EF4444'}; margin-top:1.5rem; text-align:center;">
        ${isCorrect ? 'Correct!' : 'Incorrect.'}
    </h3>`;
});

nextBtn.addEventListener('click', async () => {
    currentIndex++;
    if (currentIndex < questions.length) {
        renderQuestion();
    } else {
        await finishQuiz();
    }
});

function checkAnswer(type, studentAns, correctAns) {
    if (type === 'poll') {
        return studentAns === correctAns.correct_index;
    }
    
    if (type === 'connect_the_dot') {
        if (!studentAns || studentAns.length !== correctAns.connections.length) return false;
        
        return correctAns.connections.every(correctPair => {
            return studentAns.some(studentPair => {
                return (studentPair[0] === correctPair[0] && studentPair[1] === correctPair[1]) || 
                       (studentPair[0] === correctPair[1] && studentPair[1] === correctPair[0]);
            });
        });
    }

    if (type === 'drag_drop') {
        if (!studentAns || Object.keys(studentAns).length !== Object.keys(correctAns.matches).length) {
            return false;
        }
        for (let item in correctAns.matches) {
            if (studentAns[item] !== correctAns.matches[item]) {
                return false;
            }
        }
        return true;
    }

    return false; 
}

async function finishQuiz() {
    gameArea.innerHTML = `<h2>Quiz Complete!</h2><h3>Your Score: ${score}/${questions.length}</h3>`;
    document.getElementById('quiz-header').style.display = 'none';
    submitBtn.style.display = 'none';
    nextBtn.style.display = 'none';

    try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
            await supabase.from('quiz_attempts').insert({
                student_id: user.id,
                quiz_id: quizId,
                score: score,
                total_questions: questions.length
            });
        }
    } catch (err) {
        console.error("Could not save score:", err);
    }
    
    gameArea.innerHTML += `<button onclick="window.location.href='dashboard.html'" style="margin-top: 2rem; background: #4F46E5;">Back to Dashboard</button>`;
}

// Start Engine
document.addEventListener('DOMContentLoaded', loadQuiz);