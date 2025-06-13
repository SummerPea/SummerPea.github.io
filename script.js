function showDownloadAlert(resourceName) {
    alert(`Downloading ${resourceName}! Thank you for your interest.`);
}

function toggleExpand(element) {
    const details = element.querySelector('.novel-details');
    const isExpanded = details.classList.contains('active');
    
    // Close all other expanded items
    document.querySelectorAll('.novel-details.active').forEach(item => {
        if (item !== details) {
            item.classList.remove('active');
        }
    });
    
    // Toggle the clicked item
    details.classList.toggle('active', !isExpanded);
}

function filterNovels() {
    const input = document.getElementById('searchInput').value.toLowerCase();
    const novels = document.querySelectorAll('.novel-item');
    
    novels.forEach(novel => {
        const title = novel.querySelector('h3').textContent.toLowerCase();
        if (title.includes(input)) {
            novel.classList.remove('hidden');
        } else {
            novel.classList.add('hidden');
        }
    });
}