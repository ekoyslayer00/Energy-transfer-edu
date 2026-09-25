import { supabase } from './supabase.js';
import { logoutUser } from './auth.js';

let currentUser = null;

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Verify user is logged in
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
        window.location.href = '../login.html';
        return;
    }
    currentUser = user;

    // 2. Load Quizzes into the dropdown
    await loadQuizzes();

    // 3. Setup event listeners
    document.getElementById('logout-btn').addEventListener('click', logoutUser);
    document.getElementById('create-quiz-form').addEventListener('submit', handleCreateQuiz);
    document.getElementById('add-question-form').addEventListener('submit', handleAddQuestion);
    document.getElementById('question-type').addEventListener('change', toggleFields);
});

async function loadQuizzes() {
    const { data, error } = await supabase
        .from('quizzes')
        .select('*')
        .order('created_at', { ascending: false });

    const select = document.getElementById('quiz-select');
    if (error) {
        select.innerHTML = `<option value="">Error loading quizzes</option>`;
        return;
    }

    if (data.length === 0) {
        select.innerHTML = `<option value="">No quizzes exist. Create one first.</option>`;
        return;
    }

    select.innerHTML = data.map(q => `<option value="${q.id}">${q.title}</option>`).join('');
}

async function handleCreateQuiz(e) {
    e.preventDefault();
    const title = document.getElementById('quiz-title').value;

    const { error } = await supabase.from('quizzes').insert([
        { title: title, teacher_id: currentUser.id }
    ]);

    if (error) {
        alert(`Error creating quiz: ${error.message}`);
    } else {
        document.getElementById('quiz-title').value = '';
        document.getElementById('quiz-msg').style.display = 'block';
        setTimeout(() => document.getElementById('quiz-msg').style.display = 'none', 3000);
        await loadQuizzes(); // Refresh dropdown
    }
}

function toggleFields(e) {
    const type = e.target.value;
    const pollFields = document.getElementById('fields-poll');
    const complexFields = document.getElementById('fields-complex');

    if (type === 'poll') {
        pollFields.style.display = 'block';
        complexFields.style.display = 'none';
    } else {
        pollFields.style.display = 'none';
        complexFields.style.display = 'block';
    }
}

async function handleAddQuestion(e) {
    e.preventDefault();
    
    const quizId = document.getElementById('quiz-select').value;
    const type = document.getElementById('question-type').value;
    
    if (!quizId) return alert("Please select or create a quiz first.");

    let content = {};
    let correctAnswer = {};

    try {
        if (type === 'poll') {
            const questionText = document.getElementById('poll-q').value;
            const options = document.getElementById('poll-opts').value.split(',').map(s => s.trim());
            const correctIndex = parseInt(document.getElementById('poll-ans').value);

            content = { question: questionText, options: options };
            correctAnswer = { correct_index: correctIndex };
        } else {
            // Parse the JSON blocks for Drag & Drop / Connect the Dots
            content = JSON.parse(document.getElementById('complex-content').value);
            correctAnswer = JSON.parse(document.getElementById('complex-ans').value);
        }
    } catch (err) {
        return alert("Error parsing input. If using complex types, ensure it is valid JSON format.");
    }

    // Insert into Supabase
    const { error } = await supabase.from('questions').insert([
        {
            quiz_id: quizId,
            type: type,
            content: content,
            correct_answer: correctAnswer
        }
    ]);

    if (error) {
        alert(`Error adding question: ${error.message}`);
    } else {
        document.getElementById('add-question-form').reset();
        // Reset dropdown to what was selected
        document.getElementById('quiz-select').value = quizId;
        document.getElementById('question-type').value = type;
        toggleFields({ target: { value: type } }); // Reset field visibility

        document.getElementById('question-msg').style.display = 'block';
        setTimeout(() => document.getElementById('question-msg').style.display = 'none', 3000);
    }
}