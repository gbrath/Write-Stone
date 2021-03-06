import {Component, OnDestroy, OnInit} from "@angular/core";
import {NavigationEnd, Router} from "@angular/router";
import {Logger} from "./core/logger/logger";
import {Subscription} from "rxjs/Subscription";
import {UtilityService} from "./core/services/utility.service";
import {BrowserSupportService} from "./core/services/browser-support.service";
import {ObservableMedia} from "@angular/flex-layout";

@Component({
    selector: 'ws-app',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnInit, OnDestroy {

    routerChangeSubscription: Subscription;
    private className: string;
    private isPlatformBrowser: boolean;
    public observableMediaSubscription : Subscription;


    public constructor(public logger: Logger, private router: Router, private utilityService: UtilityService,
                       private browserSupport: BrowserSupportService, private  media: ObservableMedia) {
        this.className = 'AppComponent';
        this.isPlatformBrowser = this.browserSupport.isPlatformBrowser;
    }

    /**
     *
     */
    ngOnInit() {
        // this.browserSupport.checkBasicBrowserSupport();
        this.deviceType();
        this.routerChangeSubscription = this.router.events.subscribe((evt) => {
            this.logger.debug(this.className, "event", evt);
            if (!(evt instanceof NavigationEnd)) {
                return;
            }

            if (this.isPlatformBrowser) {
                this.utilityService.scrollToTop();
            }
        });
    }

    public deviceType() : void {

        this.observableMediaSubscription = this.media.subscribe((change) => {
            this.logger.debug(this.className, change.mqAlias);
            if (change.mqAlias === 'sm') {
                this.navigateToPicker();
            }
        });

    }

    navigateToPicker() {
        this.router.navigateByUrl('/picker').then(()=>{
            this.logger.debug(this.className, " navigated to picker route");
        }).catch((err) => {
            this.logger.error(err);
        })
    }

    /**
     *
     */
    ngOnDestroy() {
        if( this.routerChangeSubscription ) {
            this.routerChangeSubscription.unsubscribe();
        }

        if(this.observableMediaSubscription){
            this.observableMediaSubscription.unsubscribe();
        }
    }
}
