document.getElementById('signinForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    try {
        const response = await fetch('http://localhost:3000/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        
        if (data.success) {
            localStorage.setItem('username', username);
            window.location.href = 'matches.html';
        } else {
            alert(data.message || 'Invalid username or password');
        }
    } catch (error) {
        alert('Connection error. Make sure the server is running.');
    }
});

