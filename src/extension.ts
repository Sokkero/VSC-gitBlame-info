import path = require('path');
import * as vscode from 'vscode';
import * as gitCommands from './util/gitCommands';
import * as urlParser from './util/parseURL';
import { Logger } from './util/logger';
import { gitBlameTemplate } from './util/streamParser';
import { getProperty } from './util/settings';

let gitStatusBarItem: vscode.StatusBarItem;

let isValid = false;

let gitInfo: gitBlameTemplate;

const infoMessage = <T extends vscode.MessageItem>(
	message: string,
	item: undefined | T[] = [],
): Promise<T | undefined> => {
	return Promise.resolve(vscode.window.showInformationMessage(message, ...item));
};

type ActionItem = vscode.MessageItem & {
    action: () => void;
}

export async function activate(context: vscode.ExtensionContext) {
	
	Logger.write('info', 'innoVS-gitInfo is now active');

	const getInfoCommand = 'gitInfo.expandInfo';
	context.subscriptions.push(vscode.commands.registerCommand(getInfoCommand, async () => {
		await handleInfoEvent();
	}));
	
	gitStatusBarItem = vscode.window.createStatusBarItem(getProperty('statusBarMessageDisplayLeft') ? vscode.StatusBarAlignment.Left : vscode.StatusBarAlignment.Right, getProperty('statusBarPositionPriority'));
	gitStatusBarItem.command = getInfoCommand;
	context.subscriptions.push(gitStatusBarItem);

	context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(getGitInfo));
	context.subscriptions.push(vscode.window.onDidChangeTextEditorSelection(getGitInfo));

	gitStatusBarItem.show();

	await getGitInfo();
}

function getCurrentLine(): number {
	let result: number;

	if (vscode.window.activeTextEditor) {
		result = vscode.window.activeTextEditor.selection.active.line + 1;
	}
	else {
		return 0;
	}

	return result;
}

async function handleInfoEvent(): Promise<void> {
	const actionItem: ActionItem[] = [{
		title: "Open info",
		async action() {
			if(vscode.window.activeTextEditor){
				let currentlyOpenTabfilePath = vscode.window.activeTextEditor.document.fileName;
				const currentlyOpenTabfileName = path.basename(currentlyOpenTabfilePath);
				currentlyOpenTabfilePath = currentlyOpenTabfilePath.replace(currentlyOpenTabfileName, '');
				const branchURL = await gitCommands.getURL(currentlyOpenTabfilePath);
				// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
				const commitLink = getProperty('setCommitURL') == '' ? urlParser.getCommitLink(gitInfo.hash, branchURL) : eval('`' + getProperty('setCommitURL') + '`');
				if(!getProperty('copyLinkInsteadOfOpening')){
					// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
					await vscode.env.openExternal(vscode.Uri.parse(commitLink));
				} 
				else {
					// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
					await vscode.env.clipboard.writeText(commitLink);
					await infoMessage(getProperty('infoMessageCopied'));
				}
			}
		}
	}];

	if(vscode.window.activeTextEditor){
		let currentlyOpenTabfilePath = vscode.window.activeTextEditor.document.fileName;
		const currentlyOpenTabfileName = path.basename(currentlyOpenTabfilePath);
		currentlyOpenTabfilePath = currentlyOpenTabfilePath.replace(currentlyOpenTabfileName, '');

		if(isValid){
			// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
			(await infoMessage(eval('`' + getProperty('infoMessageFormat') + '`'), actionItem))?.action();
		}
	}
}

async function getGitInfo(): Promise<void> {

	// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
	updateStatusBarItem(eval('`' + getProperty('statusBarMessageLoading') + '`'));
	if(vscode.window.activeTextEditor){
		let currentlyOpenTabfilePath = vscode.window.activeTextEditor.document.fileName;
		const currentlyOpenTabfileName = path.basename(currentlyOpenTabfilePath);

		currentlyOpenTabfilePath = currentlyOpenTabfilePath.replace(currentlyOpenTabfileName, '');

		if(await gitCommands.isGitRepo(currentlyOpenTabfilePath)) {
			if(await gitCommands.isFileTracked(currentlyOpenTabfilePath, currentlyOpenTabfileName)){
				gitInfo = await gitCommands.getBlame(currentlyOpenTabfilePath, currentlyOpenTabfileName, getCurrentLine());
				
				//Ugly but makes configuring for users easier
				if(gitInfo.committer === 'Not Committed Yet') {
					isValid = false;
					gitInfo.hash = 'Not Committed Yet';
					gitInfo.author = 'Not Committed Yet';
					gitInfo.committer = 'Not Committed Yet';
					gitInfo.mail = 'Not Committed Yet';
					gitInfo.timestamp = 'Not Committed Yet';
					gitInfo.tz = 'Not Committed Yet';
					gitInfo.date = new Date();
					gitInfo.summary = 'Not Committed Yet';
					gitInfo.timeAgo = 'Not Committed Yet';
					// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
					updateStatusBarItem(eval('`' + getProperty('statusBarMessageNoCommit') + '`'));
				} else if(gitInfo.committer === ''){
					isValid = false;
					gitInfo.hash = 'No info found';
					gitInfo.author = 'No info found';
					gitInfo.committer = 'No info found';
					gitInfo.mail = 'No info found';
					gitInfo.timestamp = 'No info found';
					gitInfo.tz = 'No info found';
					gitInfo.date = new Date();
					gitInfo.summary = 'No info found';
					gitInfo.timeAgo = 'No info found';
					// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
					updateStatusBarItem(eval('`' + getProperty('statusBarMessageNoInfoFound') + '`'));
				} else {
					isValid = true;
					// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
					updateStatusBarItem(eval('`' + getProperty('statusBarMessageFormat') + '`'));
				}
			}
			else {
				Logger.write('Warning', 'File is ignored by .gitignore');
				isValid = false;
				// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
				updateStatusBarItem(eval('`' + getProperty('statusBarMessageIgnoredFile') + '`'));
			}
		}
		else {
			Logger.write('Warning', 'File is not part of a git repository');
			isValid = false;
			// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
			updateStatusBarItem(eval('`' + getProperty('statusBarMessageNoRepo') + '`'));
		}
	} 
	else {
		Logger.write('Info', 'No file opened');
		isValid = false;
		// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
		updateStatusBarItem(eval('`' + getProperty('statusBarMessageNoFileOpened') + '`'));
	}
}

function updateStatusBarItem(text: string): void {
	gitStatusBarItem.text = text;
}
