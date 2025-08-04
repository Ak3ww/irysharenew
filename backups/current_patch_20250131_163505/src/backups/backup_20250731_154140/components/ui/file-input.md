# FileInput Component

A unified file input component that provides consistent styling and functionality across the IryShare application.

## Features

- **Unified Styling**: Consistent appearance across all file inputs
- **File Type Icons**: Automatic icon detection based on file type
- **File Size Display**: Shows file size and optional size limits
- **Loading States**: Built-in loading indicator
- **File Validation**: Optional file size limits with automatic validation
- **Clear Functionality**: Easy file removal with clear button
- **Multiple Variants**: Different styles for different use cases

## Usage

### Basic Usage

```tsx
import { FileInput } from '../ui/file-input';

function MyComponent() {
  const [file, setFile] = useState<File | null>(null);

  return (
    <FileInput
      onChange={setFile}
      selectedFile={file}
      placeholder="Choose a file..."
    />
  );
}
```

### With File Type Restrictions

```tsx
<FileInput
  onChange={setFile}
  selectedFile={file}
  accept="image/*"
  placeholder="Choose an image..."
  variant="profile"
  maxSize={5 * 1024 * 1024} // 5MB limit
/>
```

### With Loading State

```tsx
<FileInput
  onChange={setFile}
  selectedFile={file}
  loading={isUploading}
  disabled={isUploading}
  placeholder="Choose a file to upload..."
  variant="upload"
/>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `onChange` | `(file: File \| null) => void` | - | Callback when file selection changes |
| `accept` | `string` | `"*/*"` | File types to accept |
| `disabled` | `boolean` | `false` | Whether the input is disabled |
| `loading` | `boolean` | `false` | Shows loading state |
| `selectedFile` | `File \| null` | - | Currently selected file |
| `onClear` | `() => void` | - | Custom clear handler (optional) |
| `placeholder` | `string` | `"Choose a file..."` | Placeholder text |
| `maxSize` | `number` | - | Maximum file size in bytes |
| `className` | `string` | `""` | Additional CSS classes |
| `variant` | `'default' \| 'profile' \| 'upload'` | `'default'` | Visual variant |

## Variants

### Default
Standard file input with medium padding and general styling.

### Profile
Smaller variant optimized for profile picture uploads.

### Upload
Larger variant optimized for file upload modals.

## File Type Icons

The component automatically detects file types and shows appropriate icons:

- **Images**: Camera icon for `.jpg`, `.png`, `.gif`, etc.
- **Documents**: File icon for `.pdf`, `.doc`, `.txt`, etc.
- **Other**: Generic file icon for other types

## File Size Formatting

File sizes are automatically formatted:
- Bytes (B)
- Kilobytes (KB)
- Megabytes (MB)
- Gigabytes (GB)

## Examples

### Profile Picture Upload
```tsx
<FileInput
  accept="image/*"
  onChange={handleProfilePictureChange}
  selectedFile={profilePicture}
  loading={isUploading}
  placeholder="Choose profile picture..."
  variant="profile"
  maxSize={5 * 1024 * 1024} // 5MB
/>
```

### File Upload Modal
```tsx
<FileInput
  onChange={handleFileSelect}
  selectedFile={selectedFile}
  loading={uploading}
  disabled={uploading}
  placeholder="Choose a file to upload..."
  variant="upload"
  maxSize={100 * 1024 * 1024} // 100MB
/>
```

### General File Selection
```tsx
<FileInput
  onChange={setFile}
  selectedFile={file}
  placeholder="Select any file..."
  variant="default"
/>
``` 