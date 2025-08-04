import './style.css'

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <div class="min-h-screen bg-black">
    <!-- Header -->
    <header class="shadow">
      <div class="max-w-7xl mx-auto py-6 px-4">
        <h1 class="text-3xl text-white" style="font-family: 'Irys'">IRYSHARE</h1>
      </div>
    </header>

    <!-- Main Content -->
    <main class="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <!-- Action Selection -->
      <div class="bg-[#111] border border-[#67FFD4] rounded-lg p-6 mb-6">
        <h2 class="text-2xl mb-4 text-white" style="font-family: 'Irys2'">UPLOAD FILES</h2>
        
        <!-- Action Selector -->
        <div class="mb-6">
          <label class="text-white block mb-2" style="font-family: 'Irys2'">SELECT ACTION</label>
          <select 
            id="actionSelect" 
            class="bg-[#222] border border-[#67FFD4] text-white p-2 rounded-lg w-full"
            style="font-family: 'Irys2'"
          >
            <option value="">Choose what you want to do...</option>
            <option value="share">Share Files with Others</option>
            <option value="store">Store Files in My Storage</option>
          </select>
        </div>

        <!-- Upload Section (hidden until action selected) -->
        <div id="uploadSection" class="hidden">
          <!-- Share Recipients (shown only when sharing) -->
          <div id="shareOptions" class="hidden mb-6">
            <label class="text-white block mb-2" style="font-family: 'Irys2'">SHARE WITH (IRYS/EVM ADDRESSES)</label>
            <textarea 
              id="shareAddresses" 
              placeholder="Enter wallet addresses (one per line)"
              class="bg-[#222] border border-[#67FFD4] text-white p-2 rounded-lg w-full h-24 mb-2"
            ></textarea>
            <p class="text-sm text-[#67FFD4]" style="font-family: 'IrysItalic'">Files will be shared with these addresses</p>
          </div>

          <!-- File Drop Zone -->
          <div id="dropZone" class="border-2 border-dashed border-[#67FFD4] rounded-lg p-6 text-center mb-6">
            <p class="text-[#67FFD4] mb-4" style="font-family: 'IrysItalic'">Drag and drop files here or click to select</p>
            <input type="file" id="fileInput" class="hidden" />
            <button class="btn-irys px-4 py-2 text-sm" onclick="document.getElementById('fileInput').click()">SELECT FILE</button>
          </div>

          <!-- File Preview and Options -->
          <div id="uploadOptions" class="mb-6">
            <!-- Visibility Option -->
            <div class="mb-4">
              <label class="text-white block mb-2" style="font-family: 'Irys2'">FILE VISIBILITY</label>
              <select 
                id="visibilitySelect" 
                class="bg-[#222] border border-[#67FFD4] text-white p-2 rounded-lg w-full mb-2"
                style="font-family: 'Irys2'"
              >
                <option value="public">Public - Searchable via Gateway</option>
                <option value="private">Private - Encrypted Upload</option>
              </select>
            </div>

            <!-- File Preview (hidden by default) -->
            <div id="filePreview" class="hidden">
              <div class="bg-[#222] p-4 rounded-lg mb-4">
                <p class="text-white mb-2" style="font-family: 'Irys2'">Selected File:</p>
                <p id="fileName" class="text-[#67FFD4]"></p>
                <p class="text-sm text-gray-400 mt-1">Size: <span id="fileSize"></span></p>
              </div>
            </div>

            <!-- Action Button -->
            <button id="actionBtn" class="btn-irys">UPLOAD NOW</button>
          </div>
        </div>
      </div>

      <!-- Files List Section -->
      <div class="bg-[#111] border border-[#67FFD4] rounded-lg p-6">
        <h2 class="text-2xl mb-4 text-white" style="font-family: 'Irys2'">MY FILES</h2>
        
        <!-- Files Filter -->
        <div class="mb-4 flex gap-4">
          <button class="btn-irys" id="showAllFiles">ALL FILES</button>
          <button class="btn-irys" id="showSharedFiles">SHARED FILES</button>
        </div>

        <!-- Files List -->
        <div id="filesList" class="grid grid-cols-1 gap-4">
          <!-- Files will be listed here -->
          <p class="text-[#67FFD4]" style="font-family: 'IrysItalic'">No files yet</p>
        </div>
      </div>
    </main>
  </div>
`

// File handling logic
const fileInput = document.getElementById('fileInput') as HTMLInputElement;
const dropZone = document.getElementById('dropZone') as HTMLDivElement;
const filePreview = document.getElementById('filePreview') as HTMLDivElement;
const fileName = document.getElementById('fileName') as HTMLParagraphElement;
const fileSize = document.getElementById('fileSize') as HTMLSpanElement;
const actionBtn = document.getElementById('actionBtn') as HTMLButtonElement;
const actionSelect = document.getElementById('actionSelect') as HTMLSelectElement;
const shareOptions = document.getElementById('shareOptions') as HTMLDivElement;
const uploadSection = document.getElementById('uploadSection') as HTMLDivElement;
const uploadOptions = document.getElementById('uploadOptions') as HTMLDivElement;

// Initially hide upload section and options
uploadSection.classList.add('hidden');
uploadOptions.classList.add('hidden');

// Handle action selection
actionSelect?.addEventListener('change', () => {
  const action = actionSelect.value;
  
  if (action) {
    uploadSection.classList.remove('hidden');
    uploadOptions.classList.remove('hidden');  // Show options immediately
    shareOptions.classList.toggle('hidden', action !== 'share');
    actionBtn.textContent = action === 'share' ? 'SHARE NOW' : 'STORE NOW';
  } else {
    uploadSection.classList.add('hidden');
    uploadOptions.classList.add('hidden');
    fileInput.value = '';
    filePreview.classList.add('hidden');
  }
});

// Handle file selection
fileInput?.addEventListener('change', (e) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (file) {
    showFilePreview(file);
  }
});

// Handle drag and drop
dropZone?.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropZone.classList.add('border-blue-500');
});

dropZone?.addEventListener('dragleave', () => {
  dropZone.classList.remove('border-blue-500');
});

dropZone?.addEventListener('drop', (e) => {
  e.preventDefault();
  dropZone.classList.remove('border-blue-500');
  const file = e.dataTransfer?.files[0];
  if (file) {
    showFilePreview(file);
  }
});

function showFilePreview(file: File) {
  fileName.textContent = file.name;
  fileSize.textContent = formatFileSize(file.size);
  filePreview.classList.remove('hidden');
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Handle action button click
actionBtn?.addEventListener('click', () => {
  const action = actionSelect.value;
  const visibility = (document.getElementById('visibilitySelect') as HTMLSelectElement).value;
  
  if (action === 'share') {
    const addresses = (document.getElementById('shareAddresses') as HTMLTextAreaElement).value;
    console.log('Sharing file with:', addresses.split('\n'));
    console.log('Visibility:', visibility);
  } else {
    console.log('Storing file in personal storage');
    console.log('Visibility:', visibility);
  }
});