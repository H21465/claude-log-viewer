"""Test script for log parser."""

import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent))

from services.log_parser import (
    get_project_hash,
    list_all_projects,
    scan_project_logs,
)


def main():
    print("=== Claude CLI Log Parser Test ===\n")

    # Test 1: List all projects
    print("1. Listing all projects:")
    projects = list_all_projects()
    for project_path, project_hash in projects[:5]:  # Show first 5
        print(f"  {project_path}")
        print(f"    Hash: {project_hash}")
    print(f"  ... Total {len(projects)} projects\n")

    # Test 2: Get hash for specific project
    test_project = "/Users/hayamamo/projects/tmp/live"
    print(f"2. Getting hash for: {test_project}")
    project_hash = get_project_hash(test_project)
    print(f"  Hash: {project_hash}\n")

    # Test 3: Scan project logs
    if project_hash:
        print(f"3. Scanning logs for: {test_project}")
        messages = scan_project_logs(test_project)
        print(f"  Total messages: {len(messages)}")

        if messages:
            print("\n  First 3 messages:")
            for msg in messages[:3]:
                print(f"    - [{msg.role}] {msg.timestamp}")
                print(f"      UUID: {msg.uuid}")
                print(f"      Model: {msg.model}")
                content_preview = msg.content_plain[:100].replace("\n", " ")
                print(f"      Content: {content_preview}...")
                print()


if __name__ == "__main__":
    main()
