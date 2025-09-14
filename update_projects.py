import os
import re


SCRIPT_PATH = "script.js"


def get_project_folders():
    exclude_list = [
        ".git",
        ".vscode",
        "__pycache__",
        "node_modules",
        "update_projects.py",
        "generate-projects.js",
    ]

    all_items = os.listdir(".")
    project_folders = [
        item
        for item in all_items
        if os.path.isdir(item)
        and item not in exclude_list
        and os.path.exists(os.path.join(item, "config.json"))
    ]
    project_folders.sort()
    return project_folders


def update_script_js(project_folders):
    try:
        with open(SCRIPT_PATH, "r", encoding="utf-8") as f:
            content = f.read()

        js_array_list = ", ".join([f"'{folder}'" for folder in project_folders])

        replacement_text = (
            f"    const projectFolders = [\n        {js_array_list}\n    ];"
        )

        pattern = re.compile(r"(\s*const projectFolders = \[)(.*?)(\];)", re.DOTALL)

        new_content, num_replacements = pattern.subn(replacement_text, content)

        if num_replacements == 0:
            print(
                f"Warning: Could not find the 'projectFolders' array in {SCRIPT_PATH}. File not updated."
            )
            return

        with open(SCRIPT_PATH, "w", encoding="utf-8") as f:
            f.write(new_content)

        print(
            f"Successfully updated {SCRIPT_PATH} with {len(project_folders)} projects."
        )
        print("Updated list:", project_folders)

    except FileNotFoundError:
        print(f"Error: The file {SCRIPT_PATH} was not found in the current directory.")
    except Exception as e:
        print(f"An unexpected error occurred: {e}")


if __name__ == "__main__":
    folders = get_project_folders()
    if folders:
        update_script_js(folders)
    else:
        print("No project folders containing 'config.json' were found.")
