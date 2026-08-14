Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
currentDir = fso.GetParentFolderName(WScript.ScriptFullName)

pythonwPath = currentDir & "\backend\.venv\Scripts\pythonw.exe"
scriptPath = currentDir & "\tray_app.py"

' Set working directory to project root and launch tray_app silently
WshShell.CurrentDirectory = currentDir
WshShell.Run """" & pythonwPath & """ """ & scriptPath & """", 0, False

Set WshShell = Nothing