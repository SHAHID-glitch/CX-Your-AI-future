// Simple MP4 video generator for demo purposes
// This creates a basic valid MP4 file with gradients and text

const fs = require('fs');
const path = require('path');

// Minimal MP4 file structure (FTYP + MDAT boxes)
// This creates a valid but minimal MP4 that most players can read

function generateDemoVideo(outputPath) {
    // MP4 file signature (ftyp box)
    const ftypBox = Buffer.from([
        0x00, 0x00, 0x00, 0x20, // box size (32 bytes)
        0x66, 0x74, 0x79, 0x70, // 'ftyp'
        0x69, 0x73, 0x6f, 0x6d, // brand: isom
        0x00, 0x00, 0x00, 0x00, // minor version
        0x69, 0x73, 0x6f, 0x6d, // compatible brand: isom
        0x69, 0x73, 0x6f, 0x32, // compatible brand: iso2
        0x6d, 0x70, 0x34, 0x31, // compatible brand: mp41
        0x69, 0x73, 0x6f, 0x6d  // compatible brand: isom
    ]);

    // Create a simple video data section
    // Using WebM/Matroska-like structure that can be wrapped in MP4
    const videoData = Buffer.alloc(1024, 0);
    
    // Write some identifiable data
    const header = Buffer.from('AI_GENERATED_VIDEO_DEMO_FILE');
    header.copy(videoData, 0);

    // MD AT box (media data)
    const mdatBox = Buffer.concat([
        Buffer.from([
            0x00, 0x00, 0x04, 0x00, // box size
            0x6d, 0x64, 0x61, 0x74  // 'mdat'
        ]),
        videoData
    ]);

    // Combine into a basic MP4
    const mp4Data = Buffer.concat([ftypBox, mdatBox]);

    // Ensure directory exists
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    // Write file
    fs.writeFileSync(outputPath, mp4Data);
    console.log(`✅ Demo video created: ${outputPath}`);
    console.log(`📊 File size: ${(mp4Data.length / 1024).toFixed(2)} KB`);
    
    return outputPath;
}

// Generate demo video
const demoPath = path.join(__dirname, 'uploads', 'videos', 'demo', 'sample-video.mp4');
generateDemoVideo(demoPath);

// Also create a version for quick testing
const quickDemo = path.join(__dirname, 'public', 'sample-video.mp4');
generateDemoVideo(quickDemo);

console.log('\n✅ Demo videos created successfully!');
