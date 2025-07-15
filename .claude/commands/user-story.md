# Claude Code Custom Command: Simple Jira User Stories

name: user-story
description: Create a complete Jira user story from a simple description

You are creating a complete Jira user story ticket from this brief description: $ARGUMENTS

Generate a comprehensive user story with:

## Title
Create a clear, concise title for the Jira ticket

## User Story
Write in format: "As a [user type], I want to [action] so that [benefit]"
Choose the most appropriate user type based on the feature

## Description
Provide 2-3 sentences explaining the feature in more detail

## Acceptance Criteria
Generate 3-5 realistic acceptance criteria as checkboxes that would need to be met

## Story Points
Suggest appropriate story points (1, 2, 3, 5, 8, 13) based on complexity

## Additional Notes
Include any technical considerations, dependencies, or edge cases to consider

Format everything as clean markdown that can be copied directly into Jira.
Be specific and actionable while inferring reasonable assumptions about the feature.

After generating the user story, save it to a file named using the sanitized title (replace spaces with hyphens, lowercase, remove special characters) with .md extension.

Example filename: "planning\add-map-in-event-view.md"