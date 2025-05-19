# Integration Instructions for Using with Codegen

This guide provides instructions for integrating the PlanTreeStructCreate prompt template with Codegen to automate the creation of hierarchical project plans and their implementation in development workflows.

## Overview

Codegen can leverage the PlanTreeStructCreate template to:

1. Generate comprehensive project plans based on high-level requirements
2. Create Linear issues and sub-issues that match the hierarchical structure
3. Assign tasks to team members based on the plan
4. Track dependencies between tasks
5. Monitor progress against milestones
6. Generate status reports and visualizations

## Integration Steps

### 1. Setting Up the Template in Codegen

#### Option A: Direct Prompt Usage

```python
from codegen import CodegenClient

client = CodegenClient(api_key="your_api_key")

# Load the PlanTreeStructCreate template
with open("plantreestructcreate_template.md", "r") as file:
    template = file.read()

# Customize the template for your project
project_template = template.replace("[PROJECT_NAME]", "Customer Portal Redesign")
project_template = project_template.replace("[DOMAIN_EXPERTISE]", "web application development")
# Continue replacing other placeholders...

# Generate the project plan
response = client.generate(
    prompt=project_template,
    model="gpt-4",
    max_tokens=4000
)

project_plan = response.text
```

#### Option B: Using Codegen's Template System

```python
from codegen import CodegenClient, Template

client = CodegenClient(api_key="your_api_key")

# Register the template
client.templates.create(
    name="PlanTreeStructCreate",
    content=open("plantreestructcreate_template.md", "r").read(),
    description="Hierarchical project planning template"
)

# Use the template with parameters
response = client.templates.generate(
    template_name="PlanTreeStructCreate",
    parameters={
        "PROJECT_NAME": "Customer Portal Redesign",
        "DOMAIN_EXPERTISE": "web application development",
        "PROJECT_DESCRIPTION": "Redesign the customer portal to improve user experience and add new features",
        # Add other parameters...
    },
    model="gpt-4"
)

project_plan = response.text
```

### 2. Creating Linear Issues from the Plan

Once you have generated the project plan, you can use Codegen to create Linear issues that match the hierarchical structure:

```python
from codegen import CodegenClient
from codegen.integrations import LinearIntegration

client = CodegenClient(api_key="your_api_key")
linear = LinearIntegration(api_key="your_linear_api_key")

# Parse the project plan to extract the hierarchical structure
# This is a simplified example - you would need to implement proper parsing
phases = parse_phases(project_plan)
components = parse_components(project_plan)
tasks = parse_tasks(project_plan)

# Create parent issue for the project
project_issue = linear.create_issue(
    team_id="your_team_id",
    title=f"Project: {project_name}",
    description=project_description,
    priority=1  # High priority
)

# Create phase issues as children of the project issue
phase_issues = {}
for phase in phases:
    phase_issue = linear.create_issue(
        team_id="your_team_id",
        title=f"Phase: {phase['name']}",
        description=phase['description'],
        parent_id=project_issue.id,
        priority=2  # Medium priority
    )
    phase_issues[phase['name']] = phase_issue

# Create component issues as children of phase issues
component_issues = {}
for component in components:
    parent_phase = component['phase']
    component_issue = linear.create_issue(
        team_id="your_team_id",
        title=f"Component: {component['name']}",
        description=component['description'],
        parent_id=phase_issues[parent_phase].id,
        priority=3  # Normal priority
    )
    component_issues[component['name']] = component_issue

# Create task issues as children of component issues
for task in tasks:
    parent_component = task['component']
    assignee_id = get_assignee_id(task['assignee'])  # You would need to implement this
    
    task_issue = linear.create_issue(
        team_id="your_team_id",
        title=f"Task: {task['name']}",
        description=task['description'],
        parent_id=component_issues[parent_component].id,
        assignee_id=assignee_id,
        priority=4  # Low priority
    )
```

### 3. Visualizing the Project Plan

You can use Codegen to generate visualizations of the project plan:

```python
from codegen import CodegenClient
from codegen.visualizations import GanttChart, DependencyGraph

client = CodegenClient(api_key="your_api_key")

# Generate a Gantt chart
gantt = GanttChart()
for phase in phases:
    gantt.add_phase(
        name=phase['name'],
        start_date=phase['start_date'],
        end_date=phase['end_date']
    )
    
    for component in [c for c in components if c['phase'] == phase['name']]:
        gantt.add_component(
            name=component['name'],
            start_date=component['start_date'],
            end_date=component['end_date'],
            parent=phase['name']
        )
        
        for task in [t for t in tasks if t['component'] == component['name']]:
            gantt.add_task(
                name=task['name'],
                start_date=task['start_date'],
                end_date=task['end_date'],
                parent=component['name'],
                assignee=task['assignee']
            )

gantt.render("project_gantt.html")

# Generate a dependency graph
graph = DependencyGraph()
for task in tasks:
    graph.add_node(task['name'], type="task")
    
    for dependency in task['dependencies']:
        graph.add_edge(dependency, task['name'])

graph.render("dependency_graph.html")
```

### 4. Tracking Progress and Updating the Plan

You can use Codegen to track progress against the plan and update it as needed:

```python
from codegen import CodegenClient
from codegen.integrations import LinearIntegration
from codegen.reporting import ProgressReport

client = CodegenClient(api_key="your_api_key")
linear = LinearIntegration(api_key="your_linear_api_key")

# Get all issues for the project
project_issues = linear.get_issues(
    team_id="your_team_id",
    project_id="your_project_id"
)

# Calculate progress
total_tasks = len([i for i in project_issues if i.parent_id is not None])
completed_tasks = len([i for i in project_issues if i.parent_id is not None and i.state.type == "done"])
progress_percentage = (completed_tasks / total_tasks) * 100 if total_tasks > 0 else 0

# Generate a progress report
report = ProgressReport()
report.add_section(
    title="Project Progress",
    content=f"Overall progress: {progress_percentage:.1f}% ({completed_tasks}/{total_tasks} tasks completed)"
)

# Add milestone progress
for milestone in milestones:
    milestone_tasks = [i for i in project_issues if i.parent_id is not None and milestone['name'] in i.labels]
    milestone_completed = [i for i in milestone_tasks if i.state.type == "done"]
    milestone_percentage = (len(milestone_completed) / len(milestone_tasks)) * 100 if len(milestone_tasks) > 0 else 0
    
    report.add_section(
        title=f"Milestone: {milestone['name']}",
        content=f"Progress: {milestone_percentage:.1f}% ({len(milestone_completed)}/{len(milestone_tasks)} tasks completed)"
    )

# Generate the report
report_html = report.render()
```

## Advanced Integration: Automated Workflow

For a fully automated workflow, you can create a Codegen agent that:

1. Generates the project plan
2. Creates Linear issues
3. Assigns tasks to team members
4. Monitors progress
5. Generates regular status reports
6. Updates the plan as needed

Here's a simplified example of how to set up such an agent:

```python
from codegen import CodegenClient, Agent
from codegen.integrations import LinearIntegration, GitHubIntegration
from codegen.triggers import Schedule

client = CodegenClient(api_key="your_api_key")

# Create the agent
agent = client.agents.create(
    name="ProjectPlannerAgent",
    description="Agent for managing project plans",
    model="gpt-4"
)

# Add capabilities to the agent
agent.add_capability(LinearIntegration(api_key="your_linear_api_key"))
agent.add_capability(GitHubIntegration(token="your_github_token"))

# Define the agent's workflow
@agent.workflow
def plan_project(project_name, project_description, team_members, timeline):
    # Generate the project plan
    plan = agent.generate_from_template(
        template_name="PlanTreeStructCreate",
        parameters={
            "PROJECT_NAME": project_name,
            "DOMAIN_EXPERTISE": "software development",
            "PROJECT_DESCRIPTION": project_description,
            "TIMELINE_CONSTRAINTS": timeline,
            "TEAM_STRUCTURE": team_members,
            # Add other parameters...
        }
    )
    
    # Create Linear issues
    agent.create_linear_issues_from_plan(plan)
    
    # Set up monitoring
    agent.schedule(
        task="monitor_progress",
        schedule=Schedule.DAILY,
        args={
            "project_name": project_name
        }
    )
    
    return f"Project plan for {project_name} has been created and set up in Linear."

@agent.workflow
def monitor_progress(project_name):
    # Get progress data
    progress_data = agent.get_linear_project_progress(project_name)
    
    # Generate a status report
    report = agent.generate_progress_report(progress_data)
    
    # Send the report to stakeholders
    agent.send_email(
        to=["stakeholder@example.com"],
        subject=f"Project Status Report: {project_name}",
        body=report
    )
    
    # Check for issues that are behind schedule
    behind_schedule = agent.identify_behind_schedule_tasks(progress_data)
    
    if behind_schedule:
        # Generate recommendations for getting back on track
        recommendations = agent.generate_recommendations(behind_schedule)
        
        # Send alerts to task owners
        for task in behind_schedule:
            agent.send_linear_comment(
                issue_id=task.id,
                body=f"This task appears to be behind schedule. Recommendation: {recommendations[task.id]}"
            )
    
    return "Progress monitoring completed."

# Deploy the agent
agent.deploy()
```

## Best Practices for Codegen Integration

1. **Customize the Template**: Adapt the PlanTreeStructCreate template to your organization's specific needs and workflows.

2. **Start Small**: Begin with a small project to test the integration before applying it to larger initiatives.

3. **Refine the Parsing Logic**: Invest time in developing robust parsing logic to accurately extract the hierarchical structure from the generated plan.

4. **Validate the Plan**: Have human experts review the generated plan before implementing it in Linear or other tools.

5. **Iterative Refinement**: Use feedback from completed projects to refine the template and integration process.

6. **Combine with Human Expertise**: Use Codegen as a tool to augment human project management, not replace it entirely.

7. **Maintain Flexibility**: Allow for manual adjustments to the plan as project requirements evolve.

8. **Document Assumptions**: Clearly document the assumptions made during plan generation to help with future refinements.

## Troubleshooting

### Common Issues and Solutions

1. **Issue**: Generated plan is too generic
   **Solution**: Provide more specific context in the template parameters

2. **Issue**: Linear issue creation fails
   **Solution**: Verify API keys and permissions, check for rate limiting

3. **Issue**: Dependencies are not correctly identified
   **Solution**: Improve the parsing logic or add more explicit dependency information in the template

4. **Issue**: Timeline estimates are unrealistic
   **Solution**: Adjust the template to include more conservative estimates or add buffer time

5. **Issue**: Team members are overallocated
   **Solution**: Implement resource leveling logic in your integration code

### Getting Help

If you encounter issues with the Codegen integration, you can:

1. Check the Codegen documentation at https://docs.codegen.sh
2. Join the Codegen community Discord server
3. Submit a support ticket through the Codegen dashboard
4. Reach out to your Codegen account representative

## Example: Complete Integration Script

For a complete example of integrating PlanTreeStructCreate with Codegen and Linear, see the [example_integration.py](https://github.com/codegen-examples/plantreestructcreate-integration) repository.

