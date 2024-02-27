// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as fs from 'fs';
const axios = require('axios');
const genius = require('genius-lyrics-api');

const geniusApiKey = '3NVoN8M9F83zCC3Yr43380lZ-uepnzvjMD1koGMN0f7CT66YUlV8HF_7ZA5fYZ-a';

async function fetchLyrics(songName: string, artistName: string) {
  const options = {
    apiKey: geniusApiKey,
    title: songName,
    artist: artistName,
    optimizeQuery: true
  };

  let lyrics = "";
  
  try {
    await genius.getLyrics(options).then((text: string) => (lyrics = text));
  } catch(error) {
    console.error('Error retrieving song lyrics');
    return;
  }

  return lyrics;
}

async function createAndOpenFile(fileName: string, lyrics: string) {

  if (vscode.workspace.workspaceFolders !== undefined) {
    const filePath = vscode.workspace.workspaceFolders[0].uri.path + '/tabs/' + fileName + '.txt';
    try {
      fs.writeFileSync(filePath, lyrics);
      console.log('File created successfully.');
      vscode.window.showInformationMessage('New file created at ' + filePath);
    } catch (err) {
        console.error('Error creating file:', err);
    }

    try {
        const document = await vscode.workspace.openTextDocument(filePath);
        vscode.window.showTextDocument(document);
    } catch (err) {
        console.error('Error opening file: ', err);
    }
  } else {
      vscode.window.showWarningMessage('Error: Please open a workspace before running command');
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function activate(context: vscode.ExtensionContext) {
    console.log('Congratulations, your extension "tab-scroller" is now active!');

    let disposable = vscode.commands.registerCommand('tab-scroller.helloWorld', async () => {

      const userInput = await vscode.window.showInputBox({
        prompt: 'Type the name of a song',
        placeHolder: 'Name that tune...',
        value: '', 
      });

      const userInput2 = await vscode.window.showInputBox({
        prompt: 'Who\'s the song by?',
        placeHolder: 'Name that artist...',
        value: '', 
      });

      let artistName = "";

      if (userInput2 !== undefined) {
        artistName = userInput2;
      }

      if (userInput !== undefined) {
        const songName = userInput;
        let lyrics = "";
        try {
          const text = await fetchLyrics(songName, artistName);
          if (text !== undefined) {
            lyrics = text;
          }
        } catch(error) {
          vscode.window.showWarningMessage('Looks like we can\'t find lyrics to that song. Try again!');
          console.error('Error fetching lyrics');
        }
        const fileName = songName.toLowerCase().replace(/ /g, '-');
        if (lyrics !== "") {
          try {
            await createAndOpenFile(fileName, lyrics);
          } catch(error) {
            console.error('Error creating file');
          }
        }

      } else {
        vscode.window.showWarningMessage('User canceled the input.');
      }

    });

    context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
export function deactivate() {}
