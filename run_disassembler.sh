#!/bin/bash
# Run the module disassembler on the codegen-on-oss directory

# Set default values
REPO_PATH="."
OUTPUT_DIR="./restructured_modules"
FOCUS_DIR="codegen-on-oss"

# Print banner
echo "========================================================"
echo "          Module Disassembler Runner Script            "
echo "========================================================"
echo ""

# Check if Python is available
if ! command -v python3 &> /dev/null; then
    echo "Error: Python 3 is required but not found."
    exit 1
fi

# Check if the focus directory exists
if [ ! -d "$REPO_PATH/$FOCUS_DIR" ]; then
    echo "Warning: Focus directory '$FOCUS_DIR' not found in '$REPO_PATH'."
    echo "Please make sure the path is correct or the repository is properly cloned."
    
    # Ask user if they want to continue without a focus directory
    read -p "Continue without a focus directory? (y/n): " choice
    if [ "$choice" != "y" ]; then
        echo "Exiting."
        exit 1
    fi
    
    # Run without focus directory
    FOCUS_DIR=""
fi

# Create output directory if it doesn't exist
mkdir -p "$OUTPUT_DIR"

echo "Repository path: $REPO_PATH"
echo "Output directory: $OUTPUT_DIR"
if [ -n "$FOCUS_DIR" ]; then
    echo "Focus directory: $FOCUS_DIR"
    FOCUS_ARG="--focus-dir $FOCUS_DIR"
else
    FOCUS_ARG=""
fi
echo ""

# Run the module disassembler
echo "Running Module Disassembler..."
python3 module_disassembler.py --repo-path "$REPO_PATH" --output-dir "$OUTPUT_DIR" $FOCUS_ARG

# Check if the run was successful
if [ $? -eq 0 ]; then
    echo ""
    echo "Module Disassembler completed successfully!"
    echo "Restructured modules are available in: $OUTPUT_DIR"
    
    # List the generated files
    echo ""
    echo "Generated files:"
    ls -la "$OUTPUT_DIR"
else
    echo ""
    echo "Module Disassembler encountered an error."
    echo "Please check the logs for details."
fi

