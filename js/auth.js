// js/auth.js
import { supabase } from './supabase.js';

/**
 * Helper to get proper relative path prefix depending on current folder depth
 */
function getPathPrefix() {
    const path = window.location.pathname;
    if (path.includes('/admin/') || path.includes('/teacher/') || path.includes('/student/')) {
        return '../';
    }
    return './';
}

/**
 * Register a new user and pass metadata to SQL trigger
 */
export async function registerUser(email, password, fullName) {
    const { data, error } = await supabase.auth.signUp({
        email: email,
        password: password,
        options: {
            data: {
                full_name: fullName // Processed by database trigger handle_new_user()
            }
        }
    });

    if (error) throw error;

    alert("Registration successful! Please log in.");
    const prefix = getPathPrefix();
    window.location.href = `${prefix}login.html`;
}

/**
 * Log in an existing user and route them based on role
 */
export async function loginUser(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password
    });

    if (error) throw error;
    
    if (data?.user) {
        await routeUserByRole(data.user.id);
    }
}

/**
 * Fetch role from 'profiles' table and redirect to appropriate dashboard
 */
export async function routeUserByRole(userId) {
    const { data: profile, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();

    if (error || !profile) {
        console.error("Error fetching user role profile:", error);
        alert("Could not load profile role. Please try logging in again.");
        return;
    }

    const prefix = getPathPrefix();

    switch (profile.role) {
        case 'admin':
            window.location.href = `${prefix}admin/dashboard.html`;
            break;
        case 'teacher':
            window.location.href = `${prefix}teacher/dashboard.html`;
            break;
        case 'student':
        default:
            window.location.href = `${prefix}student/dashboard.html`;
            break;
    }
}

/**
 * Log out current user and redirect to login page
 */
export async function logoutUser() {
    const { error } = await supabase.auth.signOut();
    if (error) {
        alert(`Logout error: ${error.message}`);
        return;
    }
    const prefix = getPathPrefix();
    window.location.href = `${prefix}login.html`;
}

// ==========================================
// AUTOMATIC EVENT LISTENERS FOR DOM FORMS
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const logoutBtn = document.getElementById('logout-btn');

    // Handle Login Form Submission
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value;
            const submitBtn = loginForm.querySelector('button[type="submit"]');

            try {
                if (submitBtn) submitBtn.disabled = true;
                await loginUser(email, password);
            } catch (err) {
                alert(`Login failed: ${err.message}`);
            } finally {
                if (submitBtn) submitBtn.disabled = false;
            }
        });
    }

    // Handle Registration Form Submission
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value;
            const fullName = document.getElementById('full-name').value.trim();
            const submitBtn = registerForm.querySelector('button[type="submit"]');

            try {
                if (submitBtn) submitBtn.disabled = true;
                await registerUser(email, password, fullName);
            } catch (err) {
                alert(`Registration failed: ${err.message}`);
            } finally {
                if (submitBtn) submitBtn.disabled = false;
            }
        });
    }

    // Handle Logout Button Click
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            await logoutUser();
        });
    }
});