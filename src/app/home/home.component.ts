import {Component, NgZone, OnDestroy, OnInit, ViewEncapsulation} from "@angular/core";
import {Logger} from "../core/logger/logger";
import {Router} from "@angular/router";
import {TitleService} from "../core/services/title.service";
import {ObservableMedia} from "@angular/flex-layout";
import {Observable} from "rxjs/Observable";
import {take} from "rxjs/operators";
import {ElectronService} from "ngx-electron";
import {UtilityService} from "../core/services/utility.service";
import {BehaviorSubject} from "rxjs/BehaviorSubject";
import "rxjs/add/observable/interval";
import "rxjs/add/observable/timer";
import {PickerService} from "../electron/services/picker.service";
import {Subscription} from "rxjs/Subscription";

declare var MediaRecorder: any;
declare var navigator: any;

@Component({
    selector: 'app-home',
    templateUrl: 'home.component.html',
    styleUrls: ['./home.component.scss'],
    encapsulation: ViewEncapsulation.None
})
export class HomeComponent implements OnInit, OnDestroy {
    public disabled: Observable<boolean>;
    public stopped: Observable<boolean>;
    public pickerObs: Observable<boolean>;
    className: string;
    localStream: any;
    microAudioStream: any;
    recordedChunks: any[];
    numRecordedChunks: number;
    recorder: any;
    includeMic: boolean;
    includeSysAudio: boolean;
    public disableButtonSubject: BehaviorSubject<boolean>;
    public stopButtonSubject: BehaviorSubject<boolean>;
    pickerSubscription: Subscription;
    constructor(private logger: Logger, private router: Router, private media: ObservableMedia, private titleService: TitleService, private _electronService: ElectronService,
                private utilityService: UtilityService, private pickerService: PickerService, private ngZone: NgZone) {
        this.className = 'HomeComponent';
        this.recordedChunks = [];
        this.numRecordedChunks = 0;
        this.includeMic = false;
        this.includeSysAudio = false;
        this.disableButtonSubject = new BehaviorSubject<boolean>(false);
        this.stopButtonSubject = new BehaviorSubject<boolean>(false);
        this.disabled = this.disableButtonSubject.asObservable();
        this.stopped = this.stopButtonSubject.asObservable();
        this.pickerObs = this.pickerService.pickerSubject.asObservable();
    }


    ngOnInit() {
        this.titleService.setTitle("home");
        this.titleService.setMetaTags("home");
        this._electronService.ipcRenderer.on('source-id-selected', (event, sourceId) => {
            this.ngZone.run(()=> {
                // Users have cancel the picker dialog.
                if (!sourceId) return;
                this.logger.debug(sourceId);
                this.onAccessApproved(sourceId);
            });
        });
        this.pickerSubscription = this.pickerObs.subscribe((state) => {
            this.logger.debug(this.className,' picker status ' , state);
            this.disableButtonSubject.next(state);
        });
    }


    onAccessApproved(id) {
        if (!id) {
            this.logger.debug('Access rejected.');
            return
        }
        this.logger.debug('Window ID: ', id);
        this.logger.debug('Audio: ', this.includeMic);
        this.logger.debug('System Audio: ', this.includeSysAudio);

        const callbackFunc = (stream) => {
            let video = this.utilityService.document.querySelector('video');
            video.src = URL.createObjectURL(stream);
            stream.onended = () => {
                this.logger.debug('Media stream ended.')
            };
            this.localStream = stream;
            let videoTracks = this.localStream.getVideoTracks();
            if (this.includeMic) {
                this.logger.debug('Adding audio track.');
                let audioTracks = this.microAudioStream.getAudioTracks();
                this.localStream.addTrack(audioTracks[0]);
            }
            if (this.includeSysAudio) {
                this.logger.debug('Adding system audio track.');
                let audioTracks = stream.getAudioTracks();
                if (audioTracks.length < 1) {
                    this.logger.debug('No audio track in screen stream.')
                }
            } else {
                this.logger.debug('Not adding audio track.')
            }
            try {
                this.logger.debug('Start recording the stream.');
                this.recorder = new MediaRecorder(stream);
            } catch (e) {
                this.logger.error('Exception while creating MediaRecorder: ', e);
                return
            }
            this.recorder.ondataavailable = (event) => {
                if (event.data && event.data.size > 0) {
                    this.recordedChunks.push(event.data);
                    this.numRecordedChunks += event.data.byteLength;
                }
            };
            this.recorder.onstop = () => {
                this.logger.debug('recorderOnStop fired')
            };
            this.recorder.start();
            this.logger.debug('Recorder is started.');
            this.disableButtonSubject.next(true);
        };

        if (this.includeSysAudio) {
            navigator.webkitGetUserMedia({
                audio: true,
                video: {
                    mandatory: {
                        chromeMediaSource: 'desktop',
                        chromeMediaSourceId: id,
                        maxWidth: window.screen.width,
                        maxHeight: window.screen.height
                    }
                }
            }, callbackFunc, () => {
                this.logger.debug('getUserMedia() with audio failed.');
            })
        } else {
            navigator.webkitGetUserMedia({
                audio: false,
                video: {
                    mandatory: {
                        chromeMediaSource: 'desktop',
                        chromeMediaSourceId: id,
                        maxWidth: window.screen.width,
                        maxHeight: window.screen.height
                    }
                }
            }, callbackFunc, () => {
                this.logger.debug('getUserMedia() without audio failed.');
            })
        }
    };

    ngOnDestroy() {
        if (this.pickerSubscription) {
            this.pickerSubscription.unsubscribe();
        }
    }

    getFileName() {
        return "Write-Stone-Stream-" + Date.now() + '.webm';
    };

    playVideo() {
        this._electronService.remote.dialog.showOpenDialog({properties: ['openFile']}, (filename) => {
            this.ngZone.run(()=> {
                this.logger.debug(filename);
                let video = this.utilityService.document.querySelector('video');
                video.muted = false;
                video.src = filename;
            });
        });
    };

    disableButtons() {
        this.disableButtonSubject.next(true);
    };

    enableButtons() {
        this.disableButtonSubject.next(false);
    };

    getMicroAudio(stream) {
        this.logger.debug('Received audio stream.');
        stream.onended = () => {
            this.logger.debug('Micro audio ended.')
        };
        this.microAudioStream = stream;
    }

    microAudioCheck() {
        this.includeSysAudio = false;
        // this.utilityService.document.querySelector('#system-audio').checked = false;
        // Mute video so we don't play loopback audio.
        /*const video = this.utilityService.document.querySelector('video');
        video.muted = true;*/
        this.includeMic = !this.includeMic;
        this.logger.debug('Audio =', this.includeMic);
        if (this.includeMic) {
            navigator.webkitGetUserMedia({audio: true, video: false}, this.getMicroAudio, () => {
                this.logger.debug('getUserMedia() with audio failed.');
            });
        }
    };

    sysAudioCheck() {
        // Mute video so we don't play loopback audio
        // const video = this.utilityService.document.querySelector('video');
        // video.muted = true;
        this.includeSysAudio = !this.includeSysAudio;
        this.includeMic = false;
        this.logger.debug('System Audio =', this.includeSysAudio);
    };

    cleanRecord() {
        let video = this.utilityService.document.querySelector('video');
        video.controls = false;
        this.recordedChunks = [];
        this.numRecordedChunks = 0;
    };

    recordDesktop() {
        this.cleanRecord();
        this._electronService.ipcRenderer.send('show-picker', {types: ['screen']});
    };

    recordWindow() {
        this.cleanRecord();
        this._electronService.ipcRenderer.send('show-picker', {types: ['window']});
    };

    recordCamera() {
        this.cleanRecord();
        const callbackFunc = (stream) => {
            let video = this.utilityService.document.querySelector('video');
            video.src = URL.createObjectURL(stream);
            stream.onended = () => {
                this.logger.debug('Media stream ended.')
            };
            this.localStream = stream;
            let videoTracks = this.localStream.getVideoTracks();
            if (this.includeMic) {
                this.logger.debug('Adding audio track.');
                let audioTracks = this.microAudioStream.getAudioTracks();
                this.localStream.addTrack(audioTracks[0]);
            }
            if (this.includeSysAudio) {
                this.logger.debug('Adding system audio track.');
                let audioTracks = stream.getAudioTracks();
                if (audioTracks.length < 1) {
                    this.logger.debug('No audio track in screen stream.')
                }
            } else {
                this.logger.debug('Not adding audio track.')
            }
            try {
                this.logger.debug('Start recording the stream.');
                this.recorder = new MediaRecorder(stream);
            } catch (e) {
                this.logger.error('Exception while creating MediaRecorder: ', e);
                return
            }
            this.recorder.ondataavailable = (event) => {
                if (event.data && event.data.size > 0) {
                    this.recordedChunks.push(event.data);
                    this.numRecordedChunks += event.data.byteLength;
                }
            };
            this.recorder.onstop = () => {
                this.logger.debug('recorderOnStop fired')
            };
            this.recorder.start();
            this.logger.debug('Recorder is started.');
            this.disableButtonSubject.next(true);
        };
        navigator.webkitGetUserMedia({
            audio: false,
            video: {mandatory: {minWidth: 1024, minHeight: 768}}
        }, callbackFunc, () => {
            this.logger.debug('getUserMedia() without audio failed.');
        })
    };


    stopRecording() {
        this.logger.debug('Stopping record and starting download');
        this.stopButtonSubject.next(true);
        this.enableButtons();
        this.recorder.stop();
        this.localStream.getVideoTracks()[0].stop();
    };

    play() {
        // Unmute video.
        let video = this.utilityService.document.querySelector('video');
        video.controls = true;
        video.muted = false;
        let blob = new Blob(this.recordedChunks, {type: 'video/webm'});
        video.src = window.URL.createObjectURL(blob);
    };

    download() {
        let blob = new Blob(this.recordedChunks, {type: 'video/webm'});
        let url = URL.createObjectURL(blob);
        let a = this.utilityService.document.createElement('a');
        this.utilityService.document.body.appendChild(a);
        a.style = 'display: none';
        a.href = url;
        a.download = this.getFileName();
        a.click(()=> {
            this.logger.debug(this.className,' clicked on download ');
        });
        const subs = Observable.interval(1000).pipe(take(1)).subscribe(() => {
            if (subs){
                subs.unsubscribe();
            }
            this.utilityService.document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        });
    };
}