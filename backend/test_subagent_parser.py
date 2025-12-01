"""Test script for subagent_parser module."""

from services.subagent_parser import (
    get_subagent_log_path,
    list_subagents_in_session,
    parse_subagent_log,
)

# Test with a known project
project_hash = "-Users-hayamamo-projects-apple-app-xcode-KeyViz"
agent_id = "038a5237"
session_id = "82e9db20-c87e-40f3-8cb5-d2d02ea0b5fc"

print("=" * 80)
print("Test 1: get_subagent_log_path")
print("=" * 80)
log_path = get_subagent_log_path(project_hash, agent_id)
print(f"Log path: {log_path}")
print(f"Exists: {log_path.exists() if log_path else 'N/A'}")
print()

print("=" * 80)
print("Test 2: parse_subagent_log")
print("=" * 80)
detail = parse_subagent_log(project_hash, agent_id)
if detail:
    print(f"Agent ID: {detail.agent_id}")
    print(f"Session ID: {detail.session_id}")
    print(f"Slug: {detail.slug}")
    print(f"Model: {detail.model}")
    print(f"Total messages: {detail.stats['total_messages']}")
    print(f"Tool use count: {detail.stats['tool_use_count']}")
    print(f"Thinking count: {detail.stats['thinking_count']}")
    print(f"Input tokens: {detail.stats['total_input_tokens']}")
    print(f"Output tokens: {detail.stats['total_output_tokens']}")
    print()
    print("First message:")
    if detail.messages:
        first_msg = detail.messages[0]
        print(f"  UUID: {first_msg.uuid}")
        print(f"  Role: {first_msg.role}")
        print(f"  Model: {first_msg.model}")
        print(f"  Timestamp: {first_msg.timestamp}")
        print(f"  Has tool use: {first_msg.has_tool_use}")
        print(f"  Content blocks: {len(first_msg.content_blocks)}")
        for i, block in enumerate(first_msg.content_blocks):
            print(f"    Block {i}: type={block.type}, tool={block.tool_name}")
else:
    print("Failed to parse subagent log")
print()

print("=" * 80)
print("Test 3: list_subagents_in_session")
print("=" * 80)
subagents = list_subagents_in_session(project_hash, session_id)
print(f"Found {len(subagents)} subagents in session {session_id}")
for sa in subagents:
    print(f"  - Agent ID: {sa['agent_id']}")
    print(f"    Slug: {sa['slug']}")
    print(f"    Model: {sa['model']}")
    print(f"    Messages: {sa['message_count']}")
print()

print("=" * 80)
print("All tests completed!")
print("=" * 80)
