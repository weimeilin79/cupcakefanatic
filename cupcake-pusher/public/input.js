document.getElementById('yogurt-form').addEventListener('submit', function(event) {
    event.preventDefault();

    var store = document.getElementById('store').value;
    var blueberry = parseInt(document.getElementById('blueberry').value);
    var strawberry = parseInt(document.getElementById('strawberry').value);

    fetch('api/submit', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ store, blueberry, strawberry }),
    })
    .then(response => response.json())
    .then(data => console.log('Success:', data))
    .catch((error) => console.error('Error:', error));
});

