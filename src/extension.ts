// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as fs from 'fs';
const axios = require('axios');
const genius = require('genius-lyrics-api');
import dotenv from 'dotenv';
import { isNumberObject } from 'util/types';
dotenv.config();

const geniusApiKey = "3NVoN8M9F83zCC3Yr43380lZ-uepnzvjMD1koGMN0f7CT66YUlV8HF_7ZA5fYZ-a";
let interval: NodeJS.Timeout;
let isPaused = false;
let rewind = false;
let fastForward = false;
let stop = false;
let restart = false;

const playPauseButton = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 98);
playPauseButton.text = '$(debug-pause)';
playPauseButton.tooltip = 'Play/Pause';
playPauseButton.command = 'tab-scroller.togglePause';

const rewindButton = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 99);
rewindButton.text = '$(debug-step-back)';
rewindButton.tooltip = 'Rewind 10s';
rewindButton.command = 'tab-scroller.setRewind';

const fastForwardButton = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 97);
fastForwardButton.text = '$(debug-step-over)';
fastForwardButton.tooltip = 'Fast Forward 10s';
fastForwardButton.command = 'tab-scroller.setFastForward';

const stopButton = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 96);
stopButton.text = '$(debug-stop)';
stopButton.tooltip = 'Stop';
stopButton.command = 'tab-scroller.stopScroll';

const restartButton = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
restartButton.text = '$(debug-restart)';
restartButton.tooltip = 'Restart';
restartButton.command = 'tab-scroller.restartScroll';

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

export async function activate(context: vscode.ExtensionContext) {
    console.log('Congratulations, your extension "tab-scroller" is now active!');

    let lyrics = vscode.commands.registerCommand('tab-scroller.generateLyrics', async () => {

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

    let scroller = vscode.commands.registerCommand('tab-scroller.tabScroller', async () => {
      const userInput = await vscode.window.showInputBox({
        prompt: 'How long is the song?',
        placeHolder: 'ex. 2:37',
        value: '', 
      });

      if (userInput !== undefined) {
        const timeComponents = userInput.split(":");
        if (timeComponents.length !== 2) {
          vscode.window.showWarningMessage('Please enter a properly formatted time (Minute:Second)');
          return;
        }
        const minutes = parseInt(timeComponents[0], 10);
        const seconds = parseInt(timeComponents[1], 10);
        // TODO: verify minutes and seconds are numbers

        let totalSeconds = (minutes*60)+seconds;

        const timer = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 95);
        timer.text = `0:00/${minutes}:${seconds}`;
        timer.show();

        stopButton.show();
        fastForwardButton.show();
        playPauseButton.show();
        rewindButton.show();
        restartButton.show();

        let displaySeconds = 0;
        let displayMinutes = 0;

        // TODO: verify seconds has 2 digits

        interval = setInterval(() => {
          if (displaySeconds >= 59) {
            displaySeconds = 0;
            displayMinutes++;
          }
          if (displaySeconds < 10) {
            timer.text = `${displayMinutes}:0${displaySeconds}/${minutes}:${seconds}`;
          } else {
            timer.text = `${displayMinutes}:${displaySeconds}/${minutes}:${seconds}`;
          }

          if (displayMinutes >= minutes && displaySeconds >= seconds) {
            clearInterval(interval);
            vscode.window.showInformationMessage('The song is over. Want to play again?');
          }

          if (!isPaused) {
            displaySeconds++;
          }

          if (rewind) {
            displaySeconds-=10;
            if (displaySeconds < 0) {
              if (displayMinutes === 0) {
                displaySeconds = 0;
              } else {
                displaySeconds+=60;
                displayMinutes--;
              }
            }
            rewind = false;
          }

          if (fastForward) {
            displaySeconds+=10;
            fastForward = false;
          }

          if (stop) {
            clearInterval(interval);
            timer.hide();
            stopButton.hide();
            fastForwardButton.hide();
            playPauseButton.hide();
            rewindButton.hide();
            restartButton.hide();
            vscode.window.showInformationMessage('You have stopped the song. Play again any time!');
          }

          if (restart) {
            displayMinutes = 0;
            displaySeconds = 0;
            restart = false;
          }

        }, 1000);
      } else {
        vscode.window.showWarningMessage('User canceled the input.');
      }
      
    });

    let togglePause = vscode.commands.registerCommand('tab-scroller.togglePause', async () => {
      isPaused = !isPaused;
      if (playPauseButton.text === '$(debug-pause)') {
        playPauseButton.text = '$(debug-start)';
      } else {
        playPauseButton.text = '$(debug-pause)';
      }
    });

    let setRewind = vscode.commands.registerCommand('tab-scroller.setRewind', async () => {
      rewind = true;
    });

    let setFastForward = vscode.commands.registerCommand('tab-scroller.setFastForward', async () => {
      fastForward = true;
    });

    let stopScroll = vscode.commands.registerCommand('tab-scroller.stopScroll', async () => {
      stop = true;
    });

    let restartScroll = vscode.commands.registerCommand('tab-scroller.restartScroll', async () => {
      restart = true;
    });



    context.subscriptions.push(lyrics, scroller, togglePause, setRewind, setFastForward, stopScroll, restartScroll);
}

// This method is called when your extension is deactivated
export function deactivate() {}
