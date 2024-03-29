export function getCommitLink(hash: string, repoURL: string): string{
	let urlString = repoURL.replace(/.*(?=@)./i, "https://");
	urlString = urlString.replace(/(?<=git.+):/i, "/");
	urlString = urlString.replace(/(?<=bitbucket.*?de)\//i, "/projects/");
	urlString = urlString.replace(/(?<=bitbucket.+)\/((?!.+\/))/i, "/repos/");
	urlString = urlString.replace(/\/scm\//i, "/");
	urlString = urlString.replace(/\.git/i, "");

	if(urlString.includes('bitbucket')){
		urlString = urlString + '/commits/';
	}
	else {
		urlString = urlString + '/commit/';
	}

	urlString = urlString + hash;

	return urlString;
}